'use strict';

/**
 * RabbitMQ-backed ApplicationEvents — pub/sub so ALL service instances receive every event.
 *
 * Uses amqplib (npm install amqplib).
 * Connection string: process.env.RABBITMQ_URL (default: amqp://localhost)
 *
 * Architecture:
 *   - One FANOUT exchange per logical event type.
 *   - Each service instance declares its own EXCLUSIVE queue bound to the exchange.
 *   - Publisher:  channel.publish(exchange, '', Buffer.from(JSON.stringify(payload)))
 *   - Consumer:   channel.consume(queue, handler, { noAck: false })
 *
 * Exchange names (permanent, durable):
 *   dddsample.handlingEventQueue        ← published by handling interface
 *   dddsample.cargoHandledQueue         ← published by HandlingEventService
 *   dddsample.misdirectedCargoQueue     ← published by CargoInspectionService
 *   dddsample.deliveredCargoQueue       ← published by CargoInspectionService
 *
 * JSON payloads (primitives only — no domain objects cross the wire):
 *
 *   handlingEventQueue:
 *     { completionTime: ISO8601, trackingId: string, voyageNumber: string|null,
 *       unLocode: string, type: string }
 *
 *   cargoHandledQueue:
 *     { cargoTrackingId: string, type: string, locationCode: string,
 *       voyageNumber: string|null, completionTime: ISO8601 }
 *
 *   misdirectedCargoQueue:
 *     { trackingId: string }
 *
 *   deliveredCargoQueue:
 *     { trackingId: string }
 *
 * Usage in container.js:
 *   const mq = await RabbitMQApplicationEvents.connect();
 *   // register consumers ONCE per service:
 *   mq.onHandlingEventAttempt(async attempt => { ... });
 *   mq.onCargoHandled(async payload => { ... });
 *   const applicationEvents = mq.publisher;
 */

const EXCHANGES = {
  handlingEventQueue:    'dddsample.handlingEventQueue',
  cargoHandledQueue:     'dddsample.cargoHandledQueue',
  misdirectedCargoQueue: 'dddsample.misdirectedCargoQueue',
  deliveredCargoQueue:   'dddsample.deliveredCargoQueue',
};

/**
 * Establish connection + channel, declare all exchanges.
 *
 * @param {string} [url] - amqp://user:pass@host/vhost  (default: process.env.RABBITMQ_URL || 'amqp://localhost')
 * @returns {Promise<RabbitMQHandle>}
 */
async function connect(url) {
  const amqplib = require('amqplib');
  const conn    = await amqplib.connect(url || process.env.RABBITMQ_URL || 'amqp://localhost');
  const channel = await conn.createChannel();

  // Declare all fanout exchanges (idempotent)
  for (const exchange of Object.values(EXCHANGES)) {
    await channel.assertExchange(exchange, 'fanout', { durable: true });
  }

  // ── Private helper: publish a JSON payload to an exchange ──────────────────
  function publish(exchange, payload) {
    channel.publish(exchange, '', Buffer.from(JSON.stringify(payload)), { persistent: true });
  }

  // ── Private helper: subscribe to an exchange on an exclusive queue ──────────
  async function subscribe(exchange, handler) {
    const { queue } = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(queue, exchange, '');
    channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        await handler(payload);
        channel.ack(msg);
      } catch (e) {
        console.error(`[RabbitMQ] Failed to process message from ${exchange}:`, e.message);
        channel.nack(msg, false, false); // dead-letter, no requeue
      }
    });
  }

  // ── Publisher (matches ApplicationEvents port interface) ───────────────────
  const publisher = {
    receivedHandlingEventRegistrationAttempt(attempt) {
      publish(EXCHANGES.handlingEventQueue, {
        completionTime: attempt.completionTime instanceof Date
          ? attempt.completionTime.toISOString()
          : attempt.completionTime,
        trackingId:   attempt.trackingId.idString
          ? attempt.trackingId.idString()
          : String(attempt.trackingId),
        voyageNumber: attempt.voyageNumber
          ? (attempt.voyageNumber.idString ? attempt.voyageNumber.idString() : String(attempt.voyageNumber))
          : null,
        unLocode: attempt.unLocode.idString
          ? attempt.unLocode.idString()
          : String(attempt.unLocode),
        type: attempt.type && attempt.type.name ? attempt.type.name : String(attempt.type),
      });
    },

    cargoWasHandled(event) {
      const voyageId = event.voyage() && event.voyage().voyageNumber().idString() !== ''
        ? event.voyage().voyageNumber().idString()
        : null;
      publish(EXCHANGES.cargoHandledQueue, {
        cargoTrackingId: event.cargo().trackingId().idString(),
        type:            event.type().name,
        locationCode:    event.location().unLocode().idString(),
        voyageNumber:    voyageId,
        completionTime:  event.completionTime().toISOString(),
      });
    },

    cargoWasMisdirected(cargo) {
      publish(EXCHANGES.misdirectedCargoQueue, { trackingId: cargo.trackingId().idString() });
    },

    cargoHasArrived(cargo) {
      publish(EXCHANGES.deliveredCargoQueue, { trackingId: cargo.trackingId().idString() });
    },
  };

  // ── Consumer registration helpers (call once per service on startup) ────────
  async function onHandlingEventAttempt(handler) {
    await subscribe(EXCHANGES.handlingEventQueue, handler);
  }

  async function onCargoHandled(handler) {
    await subscribe(EXCHANGES.cargoHandledQueue, handler);
  }

  async function onCargoMisdirected(handler) {
    await subscribe(EXCHANGES.misdirectedCargoQueue, handler);
  }

  async function onCargoArrived(handler) {
    await subscribe(EXCHANGES.deliveredCargoQueue, handler);
  }

  async function close() {
    await channel.close();
    await conn.close();
  }

  return { publisher, onHandlingEventAttempt, onCargoHandled, onCargoMisdirected, onCargoArrived, close };
}

module.exports = { connect, EXCHANGES };

const EXCHANGES = {
  handlingEventQueue:    'dddsample.handlingEventQueue',
  cargoHandledQueue:     'dddsample.cargoHandledQueue',
  misdirectedCargoQueue: 'dddsample.misdirectedCargoQueue',
  deliveredCargoQueue:   'dddsample.deliveredCargoQueue',
};

async function connect(url) {
  const amqplib = (await import('amqplib')).default;
  const conn    = await amqplib.connect(url || process.env.RABBITMQ_URL || 'amqp://localhost');
  const channel = await conn.createChannel();

  for (const exchange of Object.values(EXCHANGES)) {
    await channel.assertExchange(exchange, 'fanout', { durable: true });
  }

  function publish(exchange, payload) {
    channel.publish(exchange, '', Buffer.from(JSON.stringify(payload)), { persistent: true });
  }

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
        channel.nack(msg, false, false);
      }
    });
  }

  const publisher = {
    receivedHandlingEventRegistrationAttempt(attempt) {
      publish(EXCHANGES.handlingEventQueue, {
        completionTime: attempt.completionTime instanceof Date
          ? attempt.completionTime.toISOString()
          : attempt.completionTime,
        trackingId:   attempt.trackingId,
        voyageNumber: attempt.voyageNumber ?? null,
        unLocode:     attempt.unLocode,
        type:         attempt.type && attempt.type.name ? attempt.type.name : String(attempt.type),
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

  async function onHandlingEventAttempt(handler) { await subscribe(EXCHANGES.handlingEventQueue, handler); }
  async function onCargoHandled(handler)         { await subscribe(EXCHANGES.cargoHandledQueue, handler); }
  async function onCargoMisdirected(handler)     { await subscribe(EXCHANGES.misdirectedCargoQueue, handler); }
  async function onCargoArrived(handler)         { await subscribe(EXCHANGES.deliveredCargoQueue, handler); }

  async function close() {
    await channel.close();
    await conn.close();
  }

  return { publisher, onHandlingEventAttempt, onCargoHandled, onCargoMisdirected, onCargoArrived, close };
}

export { connect, EXCHANGES };

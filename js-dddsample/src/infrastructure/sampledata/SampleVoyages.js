'use strict';

const Voyage = require('../../domain/model/voyage/Voyage');
const VoyageNumber = require('../../domain/model/voyage/VoyageNumber');
const {
  HONGKONG, HANGZHOU, TOKYO, MELBOURNE, NEWYORK,
  CHICAGO, DALLAS, HAMBURG, STOCKHOLM, HELSINKI, ROTTERDAM, SHANGHAI,
} = require('./SampleLocations');

function toDate(dateStr, timeStr = '00:00') {
  return new Date(`${dateStr}T${timeStr}:00Z`);
}

// Simple CM00x voyages (used in some tests)
const CM001 = Voyage(VoyageNumber('CM001'), { carrierMovements: () => [] });
const CM002 = Voyage(VoyageNumber('CM002'), { carrierMovements: () => [] });
const CM003 = Voyage(VoyageNumber('CM003'), { carrierMovements: () => [] });
const CM004 = Voyage(VoyageNumber('CM004'), { carrierMovements: () => [] });
const CM005 = Voyage(VoyageNumber('CM005'), { carrierMovements: () => [] });
const CM006 = Voyage(VoyageNumber('CM006'), { carrierMovements: () => [] });

// v-series voyages used in the lifecycle scenario test
const v100 = Voyage.Builder(VoyageNumber('V100'), HONGKONG)
  .addMovement(TOKYO,   toDate('2009-03-03'), toDate('2009-03-05'))
  .addMovement(NEWYORK, toDate('2009-03-06'), toDate('2009-03-09'))
  .build();

const v200 = Voyage.Builder(VoyageNumber('V200'), TOKYO)
  .addMovement(NEWYORK,   toDate('2009-03-06'), toDate('2009-03-08'))
  .addMovement(CHICAGO,   toDate('2009-03-10'), toDate('2009-03-14'))
  .addMovement(STOCKHOLM, toDate('2009-03-14'), toDate('2009-03-16'))
  .build();

const v300 = Voyage.Builder(VoyageNumber('V300'), TOKYO)
  .addMovement(ROTTERDAM,  toDate('2009-03-08'), toDate('2009-03-11'))
  .addMovement(HAMBURG,    toDate('2009-03-11'), toDate('2009-03-12'))
  .addMovement(MELBOURNE,  toDate('2009-03-14'), toDate('2009-03-18'))
  .addMovement(TOKYO,      toDate('2009-03-19'), toDate('2009-03-21'))
  .build();

const v400 = Voyage.Builder(VoyageNumber('V400'), HAMBURG)
  .addMovement(STOCKHOLM, toDate('2009-03-14'), toDate('2009-03-15'))
  .addMovement(HELSINKI,  toDate('2009-03-15'), toDate('2009-03-16'))
  .addMovement(HAMBURG,   toDate('2009-03-20'), toDate('2009-03-22'))
  .build();

// Named voyages used in sample data
const HONGKONG_TO_NEW_YORK = Voyage.Builder(VoyageNumber('0100S'), HONGKONG)
  .addMovement(HANGZHOU,  toDate('2008-10-01', '12:00'), toDate('2008-10-03', '14:30'))
  .addMovement(TOKYO,     toDate('2008-10-03', '21:00'), toDate('2008-10-06', '06:15'))
  .addMovement(MELBOURNE, toDate('2008-10-06', '11:00'), toDate('2008-10-12', '11:30'))
  .addMovement(NEWYORK,   toDate('2008-10-14', '12:00'), toDate('2008-10-23', '23:10'))
  .build();

const NEW_YORK_TO_DALLAS = Voyage.Builder(VoyageNumber('0200T'), NEWYORK)
  .addMovement(CHICAGO, toDate('2008-10-24', '07:00'), toDate('2008-10-24', '17:45'))
  .addMovement(DALLAS,  toDate('2008-10-24', '21:25'), toDate('2008-10-25', '19:30'))
  .build();

const DALLAS_TO_HELSINKI = Voyage.Builder(VoyageNumber('0300A'), DALLAS)
  .addMovement(HAMBURG,   toDate('2008-10-29', '03:30'), toDate('2008-10-31', '14:00'))
  .addMovement(STOCKHOLM, toDate('2008-11-01', '15:20'), toDate('2008-11-01', '18:40'))
  .addMovement(HELSINKI,  toDate('2008-11-02', '09:00'), toDate('2008-11-02', '11:15'))
  .build();

const DALLAS_TO_HELSINKI_ALT = Voyage.Builder(VoyageNumber('0301S'), DALLAS)
  .addMovement(HELSINKI, toDate('2008-10-29', '03:30'), toDate('2008-11-05', '15:45'))
  .build();

const HELSINKI_TO_HONGKONG = Voyage.Builder(VoyageNumber('0400S'), HELSINKI)
  .addMovement(ROTTERDAM, toDate('2008-11-04', '05:50'), toDate('2008-11-06', '14:10'))
  .addMovement(SHANGHAI,  toDate('2008-11-10', '21:45'), toDate('2008-11-22', '16:40'))
  .addMovement(HONGKONG,  toDate('2008-11-24', '07:00'), toDate('2008-11-28', '13:37'))
  .build();

const ALL = new Map();
for (const v of [CM001, CM002, CM003, CM004, CM005, CM006, v100, v200, v300, v400,
  HONGKONG_TO_NEW_YORK, NEW_YORK_TO_DALLAS, DALLAS_TO_HELSINKI, DALLAS_TO_HELSINKI_ALT, HELSINKI_TO_HONGKONG]) {
  ALL.set(v.voyageNumber().idString(), v);
}

module.exports = {
  CM001, CM002, CM003, CM004, CM005, CM006,
  v100, v200, v300, v400,
  HONGKONG_TO_NEW_YORK, NEW_YORK_TO_DALLAS, DALLAS_TO_HELSINKI, DALLAS_TO_HELSINKI_ALT, HELSINKI_TO_HONGKONG,
  ALL,
  getAll: () => [...ALL.values()],
  lookup: (voyageNumber) => ALL.get(voyageNumber.idString()) || null,
  toDate,
};

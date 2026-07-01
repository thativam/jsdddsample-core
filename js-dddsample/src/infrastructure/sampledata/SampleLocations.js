'use strict';

const Location = require('../../domain/model/location/Location');
const UnLocode = require('../../domain/model/location/UnLocode');

const HONGKONG  = Location(UnLocode('CNHKG'), 'Hongkong');
const MELBOURNE = Location(UnLocode('AUMEL'), 'Melbourne');
const STOCKHOLM = Location(UnLocode('SESTO'), 'Stockholm');
const HELSINKI  = Location(UnLocode('FIHEL'), 'Helsinki');
const CHICAGO   = Location(UnLocode('USCHI'), 'Chicago');
const TOKYO     = Location(UnLocode('JNTKO'), 'Tokyo');
const HAMBURG   = Location(UnLocode('DEHAM'), 'Hamburg');
const SHANGHAI  = Location(UnLocode('CNSHA'), 'Shanghai');
const ROTTERDAM = Location(UnLocode('NLRTM'), 'Rotterdam');
const GOTHENBURG = Location(UnLocode('SEGOT'), 'Göteborg');
const HANGZHOU  = Location(UnLocode('CNHGH'), 'Hangzhou');
const NEWYORK   = Location(UnLocode('USNYC'), 'New York');
const DALLAS    = Location(UnLocode('USDAL'), 'Dallas');

const ALL = new Map([
  [HONGKONG.unLocode().idString(),  HONGKONG],
  [MELBOURNE.unLocode().idString(), MELBOURNE],
  [STOCKHOLM.unLocode().idString(), STOCKHOLM],
  [HELSINKI.unLocode().idString(),  HELSINKI],
  [CHICAGO.unLocode().idString(),   CHICAGO],
  [TOKYO.unLocode().idString(),     TOKYO],
  [HAMBURG.unLocode().idString(),   HAMBURG],
  [SHANGHAI.unLocode().idString(),  SHANGHAI],
  [ROTTERDAM.unLocode().idString(), ROTTERDAM],
  [GOTHENBURG.unLocode().idString(), GOTHENBURG],
  [HANGZHOU.unLocode().idString(),  HANGZHOU],
  [NEWYORK.unLocode().idString(),   NEWYORK],
  [DALLAS.unLocode().idString(),    DALLAS],
]);

module.exports = {
  HONGKONG, MELBOURNE, STOCKHOLM, HELSINKI, CHICAGO, TOKYO,
  HAMBURG, SHANGHAI, ROTTERDAM, GOTHENBURG, HANGZHOU, NEWYORK, DALLAS,
  ALL,
  getAll: () => [...ALL.values()],
  lookup: (unLocode) => ALL.get(unLocode.idString()) || null,
};

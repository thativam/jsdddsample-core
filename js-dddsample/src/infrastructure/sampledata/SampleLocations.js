'use strict';

const Location = require('../../domain/model/location/Location');
const UnLocode = require('../../domain/model/location/UnLocode');

const HONGKONG  = new Location(new UnLocode('CNHKG'), 'Hongkong');
const MELBOURNE = new Location(new UnLocode('AUMEL'), 'Melbourne');
const STOCKHOLM = new Location(new UnLocode('SESTO'), 'Stockholm');
const HELSINKI  = new Location(new UnLocode('FIHEL'), 'Helsinki');
const CHICAGO   = new Location(new UnLocode('USCHI'), 'Chicago');
const TOKYO     = new Location(new UnLocode('JNTKO'), 'Tokyo');
const HAMBURG   = new Location(new UnLocode('DEHAM'), 'Hamburg');
const SHANGHAI  = new Location(new UnLocode('CNSHA'), 'Shanghai');
const ROTTERDAM = new Location(new UnLocode('NLRTM'), 'Rotterdam');
const GOTHENBURG = new Location(new UnLocode('SEGOT'), 'Göteborg');
const HANGZHOU  = new Location(new UnLocode('CNHGH'), 'Hangzhou');
const NEWYORK   = new Location(new UnLocode('USNYC'), 'New York');
const DALLAS    = new Location(new UnLocode('USDAL'), 'Dallas');

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

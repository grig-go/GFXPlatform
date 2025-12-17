export interface StateInfo {
  name: string;
  population: number;
  registeredVoters: {
    total: number;
    democrat: number;
    republican: number;
    independent: number;
    other: number;
  };
  ageBreakdown: {
    '18-29': number;
    '30-44': number;
    '45-64': number;
    '65+': number;
  };
}

// State demographic data (2024 estimates)
export const stateData: Record<string, StateInfo> = {
  'Alabama': {
    name: 'Alabama',
    population: 5074296,
    registeredVoters: {
      total: 3326812,
      democrat: 998044,
      republican: 1663406,
      independent: 532290,
      other: 133072
    },
    ageBreakdown: {
      '18-29': 22.5,
      '30-44': 25.8,
      '45-64': 32.1,
      '65+': 19.6
    }
  },
  'Alaska': {
    name: 'Alaska',
    population: 733583,
    registeredVoters: {
      total: 587462,
      democrat: 176239,
      republican: 234986,
      independent: 147054,
      other: 29183
    },
    ageBreakdown: {
      '18-29': 24.2,
      '30-44': 28.5,
      '45-64': 30.8,
      '65+': 16.5
    }
  },
  'Arizona': {
    name: 'Arizona',
    population: 7359197,
    registeredVoters: {
      total: 4368715,
      democrat: 1310615,
      republican: 1572579,
      independent: 1310615,
      other: 174906
    },
    ageBreakdown: {
      '18-29': 21.8,
      '30-44': 26.4,
      '45-64': 31.2,
      '65+': 20.6
    }
  },
  'Arkansas': {
    name: 'Arkansas',
    population: 3045637,
    registeredVoters: {
      total: 1776120,
      democrat: 532836,
      republican: 1065672,
      independent: 142090,
      other: 35522
    },
    ageBreakdown: {
      '18-29': 21.9,
      '30-44': 25.2,
      '45-64': 32.5,
      '65+': 20.4
    }
  },
  'California': {
    name: 'California',
    population: 38965193,
    registeredVoters: {
      total: 22047448,
      democrat: 9421113,
      republican: 5261507,
      independent: 5952160,
      other: 1412668
    },
    ageBreakdown: {
      '18-29': 23.1,
      '30-44': 28.2,
      '45-64': 30.5,
      '65+': 18.2
    }
  },
  'Colorado': {
    name: 'Colorado',
    population: 5877610,
    registeredVoters: {
      total: 4052727,
      democrat: 1216818,
      republican: 1135763,
      independent: 1540909,
      other: 159237
    },
    ageBreakdown: {
      '18-29': 22.4,
      '30-44': 27.8,
      '45-64': 31.6,
      '65+': 18.2
    }
  },
  'Connecticut': {
    name: 'Connecticut',
    population: 3626205,
    registeredVoters: {
      total: 2400055,
      democrat: 864020,
      republican: 456011,
      independent: 960022,
      other: 120002
    },
    ageBreakdown: {
      '18-29': 20.5,
      '30-44': 25.8,
      '45-64': 32.8,
      '65+': 20.9
    }
  },
  'Delaware': {
    name: 'Delaware',
    population: 1018396,
    registeredVoters: {
      total: 739645,
      democrat: 325644,
      republican: 207406,
      independent: 177517,
      other: 29078
    },
    ageBreakdown: {
      '18-29': 21.2,
      '30-44': 25.9,
      '45-64': 32.4,
      '65+': 20.5
    }
  },
  'Florida': {
    name: 'Florida',
    population: 22610726,
    registeredVoters: {
      total: 14365957,
      democrat: 4881226,
      republican: 5602380,
      independent: 3304736,
      other: 577615
    },
    ageBreakdown: {
      '18-29': 19.8,
      '30-44': 25.2,
      '45-64': 31.5,
      '65+': 23.5
    }
  },
  'Georgia': {
    name: 'Georgia',
    population: 11029227,
    registeredVoters: {
      total: 7233211,
      democrat: 2532623,
      republican: 2965968,
      independent: 1591008,
      other: 143612
    },
    ageBreakdown: {
      '18-29': 23.5,
      '30-44': 27.8,
      '45-64': 31.2,
      '65+': 17.5
    }
  },
  'Hawaii': {
    name: 'Hawaii',
    population: 1435138,
    registeredVoters: {
      total: 804477,
      democrat: 345931,
      republican: 120671,
      independent: 289608,
      other: 48267
    },
    ageBreakdown: {
      '18-29': 21.8,
      '30-44': 26.5,
      '45-64': 31.9,
      '65+': 19.8
    }
  },
  'Idaho': {
    name: 'Idaho',
    population: 1964726,
    registeredVoters: {
      total: 1037901,
      democrat: 197401,
      republican: 622681,
      independent: 186580,
      other: 31239
    },
    ageBreakdown: {
      '18-29': 23.8,
      '30-44': 27.2,
      '45-64': 31.5,
      '65+': 17.5
    }
  },
  'Illinois': {
    name: 'Illinois',
    population: 12549689,
    registeredVoters: {
      total: 8174198,
      democrat: 3677389,
      republican: 2043480,
      independent: 2289234,
      other: 164095
    },
    ageBreakdown: {
      '18-29': 21.5,
      '30-44': 26.8,
      '45-64': 32.2,
      '65+': 19.5
    }
  },
  'Indiana': {
    name: 'Indiana',
    population: 6862199,
    registeredVoters: {
      total: 4654975,
      democrat: 1396493,
      republican: 2327488,
      independent: 791146,
      other: 139848
    },
    ageBreakdown: {
      '18-29': 22.2,
      '30-44': 26.5,
      '45-64': 32.1,
      '65+': 19.2
    }
  },
  'Iowa': {
    name: 'Iowa',
    population: 3207004,
    registeredVoters: {
      total: 2241903,
      democrat: 672571,
      republican: 918578,
      independent: 582294,
      other: 68460
    },
    ageBreakdown: {
      '18-29': 21.8,
      '30-44': 25.2,
      '45-64': 32.5,
      '65+': 20.5
    }
  },
  'Kansas': {
    name: 'Kansas',
    population: 2940546,
    registeredVoters: {
      total: 1941156,
      democrat: 485289,
      republican: 873820,
      independent: 504484,
      other: 77563
    },
    ageBreakdown: {
      '18-29': 22.5,
      '30-44': 26.1,
      '45-64': 31.8,
      '65+': 19.6
    }
  },
  'Kentucky': {
    name: 'Kentucky',
    population: 4526154,
    registeredVoters: {
      total: 3385316,
      democrat: 1608901,
      republican: 1591684,
      independent: 135413,
      other: 49318
    },
    ageBreakdown: {
      '18-29': 21.5,
      '30-44': 25.8,
      '45-64': 32.9,
      '65+': 19.8
    }
  },
  'Louisiana': {
    name: 'Louisiana',
    population: 4590241,
    registeredVoters: {
      total: 2970057,
      democrat: 1188023,
      republican: 1218825,
      independent: 475209,
      other: 88000
    },
    ageBreakdown: {
      '18-29': 22.8,
      '30-44': 26.5,
      '45-64': 31.8,
      '65+': 18.9
    }
  },
  'Maine': {
    name: 'Maine',
    population: 1385340,
    registeredVoters: {
      total: 1084166,
      democrat: 325250,
      republican: 289083,
      independent: 391500,
      other: 78333
    },
    ageBreakdown: {
      '18-29': 19.2,
      '30-44': 24.5,
      '45-64': 33.8,
      '65+': 22.5
    }
  },
  'Maryland': {
    name: 'Maryland',
    population: 6164660,
    registeredVoters: {
      total: 4100119,
      democrat: 2255066,
      republican: 943027,
      independent: 779023,
      other: 123003
    },
    ageBreakdown: {
      '18-29': 21.8,
      '30-44': 27.2,
      '45-64': 32.1,
      '65+': 18.9
    }
  },
  'Massachusetts': {
    name: 'Massachusetts',
    population: 7001399,
    registeredVoters: {
      total: 4850979,
      democrat: 1552813,
      republican: 437588,
      independent: 2425490,
      other: 435088
    },
    ageBreakdown: {
      '18-29': 21.5,
      '30-44': 27.8,
      '45-64': 32.2,
      '65+': 18.5
    }
  },
  'Michigan': {
    name: 'Michigan',
    population: 10037261,
    registeredVoters: {
      total: 8127891,
      democrat: 2600925,
      republican: 2275920,
      independent: 2925546,
      other: 325500
    },
    ageBreakdown: {
      '18-29': 21.2,
      '30-44': 26.1,
      '45-64': 32.5,
      '65+': 20.2
    }
  },
  'Minnesota': {
    name: 'Minnesota',
    population: 5737915,
    registeredVoters: {
      total: 3589947,
      democrat: 1472380,
      republican: 1112184,
      independent: 862370,
      other: 143013
    },
    ageBreakdown: {
      '18-29': 21.8,
      '30-44': 26.5,
      '45-64': 32.2,
      '65+': 19.5
    }
  },
  'Mississippi': {
    name: 'Mississippi',
    population: 2939690,
    registeredVoters: {
      total: 2000793,
      democrat: 800317,
      republican: 960380,
      independent: 180071,
      other: 60025
    },
    ageBreakdown: {
      '18-29': 23.2,
      '30-44': 25.8,
      '45-64': 31.5,
      '65+': 19.5
    }
  },
  'Missouri': {
    name: 'Missouri',
    population: 6196156,
    registeredVoters: {
      total: 4402031,
      democrat: 1320609,
      republican: 2025415,
      independent: 880406,
      other: 175601
    },
    ageBreakdown: {
      '18-29': 21.5,
      '30-44': 25.8,
      '45-64': 32.2,
      '65+': 20.5
    }
  },
  'Montana': {
    name: 'Montana',
    population: 1122867,
    registeredVoters: {
      total: 782007,
      democrat: 234602,
      republican: 352283,
      independent: 164481,
      other: 30641
    },
    ageBreakdown: {
      '18-29': 20.8,
      '30-44': 25.2,
      '45-64': 33.5,
      '65+': 20.5
    }
  },
  'Nebraska': {
    name: 'Nebraska',
    population: 1978379,
    registeredVoters: {
      total: 1284847,
      democrat: 308364,
      republican: 655467,
      independent: 269616,
      other: 51400
    },
    ageBreakdown: {
      '18-29': 22.5,
      '30-44': 26.2,
      '45-64': 31.8,
      '65+': 19.5
    }
  },
  'Nevada': {
    name: 'Nevada',
    population: 3194176,
    registeredVoters: {
      total: 1914506,
      democrat: 650331,
      republican: 593210,
      independent: 574652,
      other: 96313
    },
    ageBreakdown: {
      '18-29': 22.8,
      '30-44': 27.5,
      '45-64': 31.2,
      '65+': 18.5
    }
  },
  'New Hampshire': {
    name: 'New Hampshire',
    population: 1395231,
    registeredVoters: {
      total: 1026370,
      democrat: 297265,
      republican: 318467,
      independent: 359022,
      other: 51616
    },
    ageBreakdown: {
      '18-29': 19.5,
      '30-44': 25.2,
      '45-64': 33.8,
      '65+': 21.5
    }
  },
  'New Jersey': {
    name: 'New Jersey',
    population: 9290841,
    registeredVoters: {
      total: 6377971,
      democrat: 2422628,
      republican: 1593543,
      independent: 2170340,
      other: 191460
    },
    ageBreakdown: {
      '18-29': 21.2,
      '30-44': 26.8,
      '45-64': 32.5,
      '65+': 19.5
    }
  },
  'New Mexico': {
    name: 'New Mexico',
    population: 2114371,
    registeredVoters: {
      total: 1372141,
      democrat: 603341,
      republican: 466576,
      independent: 247099,
      other: 55125
    },
    ageBreakdown: {
      '18-29': 22.5,
      '30-44': 26.2,
      '45-64': 31.8,
      '65+': 19.5
    }
  },
  'New York': {
    name: 'New York',
    population: 19571216,
    registeredVoters: {
      total: 13555851,
      democrat: 6778926,
      republican: 2981288,
      independent: 3253404,
      other: 542233
    },
    ageBreakdown: {
      '18-29': 21.8,
      '30-44': 27.5,
      '45-64': 32.2,
      '65+': 18.5
    }
  },
  'North Carolina': {
    name: 'North Carolina',
    population: 10835491,
    registeredVoters: {
      total: 7623594,
      democrat: 2516788,
      republican: 2439554,
      independent: 2364382,
      other: 302870
    },
    ageBreakdown: {
      '18-29': 22.2,
      '30-44': 26.8,
      '45-64': 31.8,
      '65+': 19.2
    }
  },
  'North Dakota': {
    name: 'North Dakota',
    population: 783926,
    registeredVoters: {
      total: 549548,
      democrat: 104614,
      republican: 247229,
      independent: 164864,
      other: 32841
    },
    ageBreakdown: {
      '18-29': 24.2,
      '30-44': 26.5,
      '45-64': 30.8,
      '65+': 18.5
    }
  },
  'Ohio': {
    name: 'Ohio',
    population: 11785935,
    registeredVoters: {
      total: 8071135,
      democrat: 2421341,
      republican: 3550202,
      independent: 1775500,
      other: 324092
    },
    ageBreakdown: {
      '18-29': 21.2,
      '30-44': 25.8,
      '45-64': 32.5,
      '65+': 20.5
    }
  },
  'Oklahoma': {
    name: 'Oklahoma',
    population: 4053824,
    registeredVoters: {
      total: 2226603,
      democrat: 800376,
      republican: 1113302,
      independent: 267192,
      other: 45733
    },
    ageBreakdown: {
      '18-29': 23.2,
      '30-44': 26.5,
      '45-64': 31.2,
      '65+': 19.1
    }
  },
  'Oregon': {
    name: 'Oregon',
    population: 4240137,
    registeredVoters: {
      total: 2968896,
      democrat: 1098971,
      republican: 831125,
      independent: 949099,
      other: 89701
    },
    ageBreakdown: {
      '18-29': 21.5,
      '30-44': 26.8,
      '45-64': 32.2,
      '65+': 19.5
    }
  },
  'Pennsylvania': {
    name: 'Pennsylvania',
    population: 12961683,
    registeredVoters: {
      total: 8797946,
      democrat: 3951577,
      republican: 3606968,
      independent: 1055933,
      other: 183468
    },
    ageBreakdown: {
      '18-29': 20.5,
      '30-44': 25.8,
      '45-64': 32.8,
      '65+': 20.9
    }
  },
  'Rhode Island': {
    name: 'Rhode Island',
    population: 1095962,
    registeredVoters: {
      total: 791392,
      democrat: 316557,
      republican: 87054,
      independent: 340399,
      other: 47382
    },
    ageBreakdown: {
      '18-29': 21.2,
      '30-44': 26.5,
      '45-64': 32.8,
      '65+': 19.5
    }
  },
  'South Carolina': {
    name: 'South Carolina',
    population: 5373555,
    registeredVoters: {
      total: 3478311,
      democrat: 1043493,
      republican: 1565579,
      independent: 730286,
      other: 138953
    },
    ageBreakdown: {
      '18-29': 22.5,
      '30-44': 26.2,
      '45-64': 31.8,
      '65+': 19.5
    }
  },
  'South Dakota': {
    name: 'South Dakota',
    population: 909824,
    registeredVoters: {
      total: 636877,
      democrat: 152851,
      republican: 285589,
      independent: 171907,
      other: 26530
    },
    ageBreakdown: {
      '18-29': 23.2,
      '30-44': 26.2,
      '45-64': 31.2,
      '65+': 19.4
    }
  },
  'Tennessee': {
    name: 'Tennessee',
    population: 7126489,
    registeredVoters: {
      total: 4595434,
      democrat: 1378630,
      republican: 2297717,
      independent: 781783,
      other: 137304
    },
    ageBreakdown: {
      '18-29': 22.2,
      '30-44': 26.5,
      '45-64': 31.8,
      '65+': 19.5
    }
  },
  'Texas': {
    name: 'Texas',
    population: 30503301,
    registeredVoters: {
      total: 18144928,
      democrat: 5806776,
      republican: 7983952,
      independent: 3992976,
      other: 361224
    },
    ageBreakdown: {
      '18-29': 24.5,
      '30-44': 28.2,
      '45-64': 30.8,
      '65+': 16.5
    }
  },
  'Utah': {
    name: 'Utah',
    population: 3417734,
    registeredVoters: {
      total: 2042240,
      democrat: 326758,
      republican: 1000296,
      independent: 612672,
      other: 102514
    },
    ageBreakdown: {
      '18-29': 26.8,
      '30-44': 28.5,
      '45-64': 29.2,
      '65+': 15.5
    }
  },
  'Vermont': {
    name: 'Vermont',
    population: 647464,
    registeredVoters: {
      total: 511431,
      democrat: 143000,
      republican: 71600,
      independent: 270358,
      other: 26473
    },
    ageBreakdown: {
      '18-29': 18.5,
      '30-44': 24.2,
      '45-64': 34.8,
      '65+': 22.5
    }
  },
  'Virginia': {
    name: 'Virginia',
    population: 8715698,
    registeredVoters: {
      total: 5975975,
      democrat: 2092091,
      republican: 1732142,
      independent: 1911512,
      other: 240230
    },
    ageBreakdown: {
      '18-29': 21.8,
      '30-44': 27.2,
      '45-64': 32.1,
      '65+': 18.9
    }
  },
  'Washington': {
    name: 'Washington',
    population: 7812880,
    registeredVoters: {
      total: 5069372,
      democrat: 1776780,
      republican: 1268843,
      independent: 1826694,
      other: 197055
    },
    ageBreakdown: {
      '18-29': 22.2,
      '30-44': 27.8,
      '45-64': 31.5,
      '65+': 18.5
    }
  },
  'West Virginia': {
    name: 'West Virginia',
    population: 1770071,
    registeredVoters: {
      total: 1234050,
      democrat: 382358,
      republican: 530602,
      independent: 271621,
      other: 49469
    },
    ageBreakdown: {
      '18-29': 19.5,
      '30-44': 24.2,
      '45-64': 33.8,
      '65+': 22.5
    }
  },
  'Wisconsin': {
    name: 'Wisconsin',
    population: 5910955,
    registeredVoters: {
      total: 3684097,
      democrat: 1105229,
      republican: 1326147,
      independent: 1178593,
      other: 74128
    },
    ageBreakdown: {
      '18-29': 21.2,
      '30-44': 26.2,
      '45-64': 32.5,
      '65+': 20.1
    }
  },
  'Wyoming': {
    name: 'Wyoming',
    population: 584057,
    registeredVoters: {
      total: 350434,
      democrat: 52565,
      republican: 196243,
      independent: 87609,
      other: 14017
    },
    ageBreakdown: {
      '18-29': 21.8,
      '30-44': 26.2,
      '45-64': 32.5,
      '65+': 19.5
    }
  },
  'District of Columbia': {
    name: 'District of Columbia',
    population: 678972,
    registeredVoters: {
      total: 502041,
      democrat: 381553,
      republican: 25102,
      independent: 85347,
      other: 10039
    },
    ageBreakdown: {
      '18-29': 26.5,
      '30-44': 32.8,
      '45-64': 28.2,
      '65+': 12.5
    }
  }
};

export function getStateInfo(stateName: string): StateInfo | null {
  return stateData[stateName] || null;
}

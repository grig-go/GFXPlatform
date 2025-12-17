import { ElectionData, createOverride } from '../types/election';

export const mockElectionData: ElectionData = {
  lastUpdated: '2024-11-05T22:30:00Z',
  lastApSync: '2024-11-05T22:25:00Z',
  races: [
    {
      id: 'pres-2024',
      ap_race_id: 'AP-PRES-2024-US',
      title: 'Presidential Election 2024',
      office: 'President',
      state: 'National',
      year: '2024',
      raceType: 'PRESIDENT',
      status: createOverride('PROJECTED', 'CALLED', 'Race called by editorial decision'),
      reportingPercentage: 85,
      totalVotes: createOverride(145234567, 145500000, 'Adjusted for display purposes'),
      lastUpdated: '2024-11-05T22:30:00Z',
      lastApUpdate: '2024-11-05T22:25:00Z',
      precincts_reporting: 42567,
      precincts_total: 50000,
      called_timestamp: '2024-11-05T23:15:00Z',
      num_elect: 1,
      candidates: [
        {
          id: 'cand-1',
          ap_candidate_id: 'AP-CAND-HARRIS-2024',
          name: 'Kamala Harris',
          first_name: 'Kamala',
          last_name: 'Harris',
          party: 'DEM',
          votes: createOverride(72456789, 72556789, 'Updated with official state count'),
          percentage: createOverride(49.9, 49.8, 'Rounded for display'),
          incumbent: false,
          winner: createOverride(false, true, 'Race called by editorial decision'),
          headshot: 'https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwd29tYW4lMjBzdWl0fGVufDF8fHx8MTc1OTg4MTIzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          ballot_order: 1
        },
        {
          id: 'cand-2',
          ap_candidate_id: 'AP-CAND-TRUMP-2024',
          name: 'Donald Trump',
          first_name: 'Donald',
          last_name: 'Trump',
          party: 'REP',
          votes: 70123456,
          percentage: createOverride(48.3, 48.2, 'Rounded for display'),
          incumbent: false,
          headshot: 'https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwbWFuJTIwc3VpdHxlbnwxfHx8fDE3NTk4ODEyNDF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          ballot_order: 2
        },
        {
          id: 'cand-3',
          ap_candidate_id: 'AP-CAND-STEIN-2024',
          name: 'Jill Stein',
          first_name: 'Jill',
          last_name: 'Stein',
          party: 'GRN',
          votes: 1654322,
          percentage: 1.1,
          incumbent: false,
          headshot: 'https://images.unsplash.com/photo-1601114174531-4d95d279713e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhlbGRlcmx5JTIwd29tYW4lMjBwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NTk4ODEyNTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          ballot_order: 3
        }
      ]
    },
    {
      id: 'senate-ca-2024',
      ap_race_id: 'AP-SEN-CA-2024',
      title: 'California U.S. Senate',
      office: 'U.S. Senator',
      state: 'California',
      year: '2024',
      raceType: 'SENATE',
      status: 'CALLED',
      reportingPercentage: createOverride(87, 92, 'Manual count update from Riverside County'),
      totalVotes: 12456789,
      lastUpdated: '2024-11-05T21:45:00Z',
      lastApUpdate: '2024-11-05T21:30:00Z',
      precincts_reporting: 8234,
      precincts_total: 8956,
      called_timestamp: '2024-11-05T22:30:00Z',
      num_elect: 1,
      candidates: [
        {
          id: 'cand-4',
          ap_candidate_id: 'AP-CAND-SCHIFF-2024',
          name: 'Adam Schiff',
          party: 'DEM',
          votes: 8234567,
          percentage: 66.1,
          incumbent: false,
          winner: true,
          headshot: 'https://images.unsplash.com/photo-1601114174531-4d95d279713e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZGRlcmx5JTIwd29tYW4lMjBwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NTk4ODEyNTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
        },
        {
          id: 'cand-5',
          ap_candidate_id: 'AP-CAND-GARVEY-2024',
          name: 'Steve Garvey',
          party: 'REP',
          votes: 4222222,
          percentage: 33.9,
          incumbent: false,
          headshot: 'https://images.unsplash.com/photo-1622169804256-0eb6873ff441?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb2xpdGljaWFuJTIwaGVhZHNob3R8ZW58MXx8fHwxNzU5ODgxMjQ3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
        }
      ]
    },
    {
      id: 'house-ny14-2024',
      ap_race_id: 'AP-HOUSE-NY-14-2024',
      title: 'New York 14th Congressional District',
      office: 'U.S. Representative',
      state: 'New York',
      district: '14',
      year: '2024',
      raceType: 'HOUSE',
      status: 'CALLED',
      reportingPercentage: 78,
      totalVotes: 234567,
      lastUpdated: '2024-11-05T20:15:00Z',
      lastApUpdate: '2024-11-05T20:10:00Z',
      precincts_reporting: 287,
      precincts_total: 368,
      called_timestamp: '2024-11-05T21:45:00Z',
      num_elect: 1,
      candidates: [
        {
          id: 'cand-6',
          ap_candidate_id: 'AP-CAND-AOC-2024',
          name: createOverride('Alexandria Ocasio-Cortez', 'Alexandria Ocasio-Cortez (AOC)', 'Added nickname for clarity'),
          party: 'DEM',
          votes: 189123,
          percentage: 80.6,
          incumbent: true,
          winner: true,
          headshot: 'https://images.unsplash.com/photo-1652471949169-9c587e8898cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGV4ZWN1dGl2ZSUyMGhlYWRzaG90fGVufDF8fHx8MTc1OTg4MTI0NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
        },
        {
          id: 'cand-7',
          ap_candidate_id: 'AP-CAND-FORTE-2024',
          name: 'Tina Forte',
          party: 'REP',
          votes: 45444,
          percentage: 19.4,
          incumbent: false,
          headshot: 'https://images.unsplash.com/flagged/photo-1573582677725-863b570e3c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMGhlYWRzaG90JTIwd29tYW58ZW58MXx8fHwxNzU5ODgxMjU2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
        }
      ]
    },
    {
      id: 'gov-va-2024',
      ap_race_id: 'AP-GOV-VA-2024',
      title: 'Virginia Governor',
      office: 'Governor',
      state: 'Virginia',
      year: '2024',
      raceType: 'GOVERNOR',
      status: 'NOT_CALLED',
      reportingPercentage: 45,
      totalVotes: 1567890,
      lastUpdated: '2024-11-05T22:00:00Z',
      lastApUpdate: '2024-11-05T21:55:00Z',
      precincts_reporting: 1234,
      precincts_total: 2743,
      num_elect: 1,
      candidates: [
        {
          id: 'cand-8',
          ap_candidate_id: 'AP-CAND-MCAULIFFE-2024',
          name: 'Terry McAuliffe',
          party: 'DEM',
          votes: 789012,
          percentage: 50.3,
          incumbent: false,
          headshot: 'https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxtYW4lMjBwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMGhlYWRzaG90fGVufDF8fHx8MTc1OTg4MTI1M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
        },
        {
          id: 'cand-9',
          ap_candidate_id: 'AP-CAND-YOUNGKIN-2024',
          name: 'Glenn Youngkin',
          party: 'REP',
          votes: 778878,
          percentage: 49.7,
          incumbent: false,
          headshot: 'https://images.unsplash.com/photo-1659353221237-6a1cfb73fd90?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxtYXR1cmUlMjBtYW4lMjBidXNpbmVzcyUyMGhlYWRzaG90fGVufDF8fHx8MTc1OTg4MTI1OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
        }
      ]
    },
    {
      id: 'house-tx21-2024',
      ap_race_id: 'AP-HOUSE-TX-21-2024',
      title: 'Texas 21st Congressional District',
      office: 'U.S. Representative',
      state: 'Texas',
      district: '21',
      year: '2024',
      raceType: 'HOUSE',
      status: 'CALLED',
      reportingPercentage: 92,
      totalVotes: 187432,
      lastUpdated: '2024-11-05T21:30:00Z',
      lastApUpdate: '2024-11-05T21:25:00Z',
      precincts_reporting: 156,
      precincts_total: 169,
      called_timestamp: '2024-11-05T21:45:00Z',
      num_elect: 1,
      candidates: [
        {
          id: 'cand-10',
          ap_candidate_id: 'AP-CAND-ROY-2024',
          name: 'Chip Roy',
          first_name: 'Chip',
          last_name: 'Roy',
          party: 'REP',
          votes: 142567,
          percentage: 76.1,
          incumbent: true,
          winner: true,
          headshot: 'https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwbWFuJTIwc3VpdHxlbnwxfHx8fDE3NTk4ODEyNDF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          ballot_order: 1
        },
        {
          id: 'cand-11',
          ap_candidate_id: 'AP-CAND-JONES-2024',
          name: 'Sarah Jones',
          first_name: 'Sarah',
          last_name: 'Jones',
          party: 'DEM',
          votes: 38932,
          percentage: 20.8,
          incumbent: false,
          withdrew: createOverride(false, true, 'Withdrew due to personal reasons'),
          headshot: 'https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwd29tYW4lMjBzdWl0fGVufDF8fHx8MTc1OTg4MTIzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          ballot_order: 2
        },
        {
          id: 'cand-12',
          ap_candidate_id: 'AP-CAND-SMITH-2024',
          name: 'Bob Smith',
          first_name: 'Bob',
          last_name: 'Smith',
          party: 'LIB',
          votes: 5933,
          percentage: 3.1,
          incumbent: false,
          headshot: 'https://images.unsplash.com/photo-1622169804256-0eb6873ff441?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb2xpdGljaWFuJTIwaGVhZHNob3R8ZW58MXx8fHwxNzU5ODgxMjQ3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          ballot_order: 3
        }
      ]
    },
    {
      id: 'local-judge-2024',
      ap_race_id: 'AP-LOCAL-JUDGE-2024',
      title: 'County Judge - Uncontested',
      office: 'County Judge',
      state: 'Texas',
      year: '2024',
      raceType: 'LOCAL',
      status: 'CALLED',
      reportingPercentage: 100,
      totalVotes: 45123,
      lastUpdated: '2024-11-05T20:00:00Z',
      lastApUpdate: '2024-11-05T20:00:00Z',
      precincts_reporting: 89,
      precincts_total: 89,
      called_timestamp: '2024-11-05T20:00:00Z',
      uncontested: true,
      num_elect: 1,
      candidates: [
        {
          id: 'cand-13',
          ap_candidate_id: 'AP-CAND-WILLIAMS-2024',
          name: 'Judge Williams',
          first_name: 'Mary',
          last_name: 'Williams',
          party: 'IND',
          votes: 45123,
          percentage: 100,
          incumbent: true,
          winner: true,
          headshot: 'https://images.unsplash.com/photo-1601114174531-4d95d279713e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZGRlcmx5JTIwd29tYW4lMjBwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NTk4ODEyNTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          ballot_order: 1
        }
      ]
    }
  ],
  candidates: [
    {
      id: 'cand-1',
      ap_candidate_id: 'AP-CAND-HARRIS-2024',
      firstName: 'Kamala',
      lastName: 'Harris',
      fullName: 'Kamala Harris',
      party: 'DEM',
      headshot: 'https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwd29tYW4lMjBzdWl0fGVufDF8fHx8MTc1OTg4MTIzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      bio: 'Vice President of the United States and 2024 Democratic presidential nominee',
      birthDate: '1964-10-20',
      birthPlace: 'Oakland, California',
      education: ['Howard University (BA)', 'UC Hastings College of Law (JD)'],
      occupation: 'Vice President',
      experience: ['Vice President (2021-Present)', 'U.S. Senator from California (2017-2021)', 'Attorney General of California (2011-2017)'],
      currentRaces: ['pres-2024'],
      incumbent: true,
      website: 'https://kamalaharris.com'
    },
    {
      id: 'cand-2',
      ap_candidate_id: 'AP-CAND-TRUMP-2024',
      firstName: 'Donald',
      lastName: 'Trump',
      fullName: 'Donald J. Trump',
      party: 'REP',
      headshot: 'https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwbWFuJTIwc3VpdHxlbnwxfHx8fDE3NTk4ODEyNDF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      bio: 'Former President of the United States and 2024 Republican presidential nominee',
      birthDate: '1946-06-14',
      birthPlace: 'Queens, New York',
      education: ['Wharton School of the University of Pennsylvania (BS Economics)'],
      occupation: 'Businessman, Former President',
      experience: ['45th President of the United States (2017-2021)', 'Business Executive'],
      currentRaces: ['pres-2024'],
      pastRaces: [
        { year: '2020', office: 'President', result: 'LOST' },
        { year: '2016', office: 'President', result: 'WON' }
      ],
      website: 'https://www.donaldjtrump.com'
    },
    {
      id: 'cand-3',
      ap_candidate_id: 'AP-CAND-KENNEDY-2024',
      firstName: 'Robert',
      lastName: 'Kennedy Jr.',
      fullName: 'Robert F. Kennedy Jr.',
      party: 'IND',
      headshot: 'https://images.unsplash.com/photo-1693035730007-fbc2c14c6814?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwb2xpdGljaWFuJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzU5ODcxNDgwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      bio: 'Environmental attorney and independent presidential candidate',
      birthDate: '1954-01-17',
      birthPlace: 'Washington, D.C.',
      education: ['Harvard University (BA)', 'University of Virginia School of Law (JD)', 'Pace University School of Law (LLM)'],
      occupation: 'Environmental Attorney',
      experience: ['Environmental Lawyer', 'Author', 'Activist'],
      currentRaces: ['pres-2024'],
      website: 'https://www.kennedy24.com'
    },
    {
      id: 'cand-4',
      ap_candidate_id: 'AP-CAND-ALLRED-2024',
      firstName: 'Colin',
      lastName: 'Allred',
      fullName: 'Colin Allred',
      party: 'DEM',
      headshot: 'https://images.unsplash.com/photo-1758599543154-76ec1c4257df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHByb2Zlc3Npb25hbCUyMGhlYWRzaG90fGVufDF8fHx8MTc1OTk0Mjg1MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      bio: 'U.S. Representative from Texas and Senate candidate',
      birthDate: '1983-04-15',
      birthPlace: 'Dallas, Texas',
      education: ['Baylor University (BA)', 'UC Berkeley School of Law (JD)'],
      occupation: 'U.S. Representative',
      experience: ['U.S. Representative TX-32 (2019-Present)', 'Civil Rights Attorney', 'Former NFL Player'],
      currentRaces: ['sen-tx-2024'],
      website: 'https://colinallred.com'
    },
    {
      id: 'cand-5',
      ap_candidate_id: 'AP-CAND-CRUZ-2024',
      firstName: 'Ted',
      lastName: 'Cruz',
      fullName: 'Ted Cruz',
      party: 'REP',
      headshot: 'https://images.unsplash.com/photo-1585066039196-e30d097340be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2xpdGljYWwlMjBsZWFkZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NTk5NTMwOTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      bio: 'U.S. Senator from Texas',
      birthDate: '1970-12-22',
      birthPlace: 'Calgary, Alberta, Canada',
      education: ['Princeton University (BA)', 'Harvard Law School (JD)'],
      occupation: 'U.S. Senator',
      experience: ['U.S. Senator from Texas (2013-Present)', 'Solicitor General of Texas (2003-2008)'],
      currentRaces: ['sen-tx-2024'],
      incumbent: true,
      pastRaces: [
        { year: '2018', office: 'U.S. Senate - Texas', result: 'WON' },
        { year: '2012', office: 'U.S. Senate - Texas', result: 'WON' }
      ],
      website: 'https://www.tedcruz.org'
    },
    {
      id: 'cand-10',
      ap_candidate_id: 'AP-CAND-ROY-2024',
      firstName: 'Chip',
      lastName: 'Roy',
      fullName: 'Chip Roy',
      party: 'REP',
      headshot: 'https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwbWFuJTIwc3VpdHxlbnwxfHx8fDE3NTk4ODEyNDF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      bio: 'U.S. Representative from Texas\'s 21st congressional district',
      birthDate: '1972-08-07',
      birthPlace: 'Bethesda, Maryland',
      education: ['University of Virginia (BA)', 'University of Texas School of Law (JD)'],
      occupation: 'U.S. Representative',
      experience: ['U.S. Representative TX-21 (2019-Present)', 'Chief of Staff to Senator Ted Cruz', 'Texas First Assistant Attorney General'],
      currentRaces: ['house-tx21-2024'],
      incumbent: true,
      website: 'https://www.chiproy.com'
    },
    {
      id: 'cand-13',
      ap_candidate_id: 'AP-CAND-WILLIAMS-2024',
      firstName: 'Mary',
      lastName: 'Williams',
      fullName: 'Judge Mary Williams',
      party: 'IND',
      headshot: 'https://images.unsplash.com/photo-1758518729459-235dcaadc611?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleGVjdXRpdmUlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc1OTk1MzA5N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      bio: 'County Judge',
      birthDate: '1965-03-12',
      birthPlace: 'Austin, Texas',
      education: ['University of Texas at Austin (BA)', 'University of Texas School of Law (JD)'],
      occupation: 'County Judge',
      experience: ['County Judge (2016-Present)', 'District Court Judge (2010-2016)', 'Attorney in Private Practice'],
      currentRaces: ['local-judge-2024'],
      incumbent: true
    }
  ],
  parties: [
    {
      id: 'dem',
      code: 'DEM',
      name: 'Democratic Party',
      fullName: 'Democratic Party',
      abbreviations: ['DEM', 'D', 'Dem', 'Democratic'],
      aliases: ['Democrats', 'Dems'],
      color: '#0015BC',
      colors: {
        primary: '#0015BC',
        secondary: '#2E5EAA',
        light: '#6B9BD1',
        dark: '#001F7A'
      },
      founded: '1828',
      ideology: 'Modern liberalism, social liberalism, progressivism',
      headquarters: 'Washington, D.C.',
      leaders: [
        { title: 'President', name: 'Joe Biden', since: '2021' },
        { title: 'Vice President', name: 'Kamala Harris', since: '2021' },
        { title: 'DNC Chair', name: 'Jaime Harrison', since: '2021' }
      ],
      description: 'The Democratic Party is one of the two major contemporary political parties in the United States.',
      history: 'Founded in 1828, the Democratic Party is the world\'s oldest active political party. The party has evolved significantly over time, from its origins in Jeffersonian democracy to its current platform focused on progressive social policies and economic regulation.',
      website: 'https://democrats.org',
      socialMedia: {
        twitter: '@TheDemocrats',
        facebook: 'Democrats',
        instagram: '@democrats'
      }
    },
    {
      id: 'rep',
      code: 'REP',
      name: 'Republican Party',
      fullName: 'Republican Party',
      abbreviations: ['REP', 'R', 'Rep', 'Republican', 'GOP'],
      aliases: ['Republicans', 'GOP', 'Grand Old Party'],
      color: '#E81B23',
      colors: {
        primary: '#E81B23',
        secondary: '#C8102E',
        light: '#FF6B6B',
        dark: '#A50C15'
      },
      founded: '1854',
      ideology: 'American conservatism, fiscal conservatism, social conservatism',
      headquarters: 'Washington, D.C.',
      leaders: [
        { title: 'RNC Chair', name: 'Michael Whatley', since: '2024' },
        { title: 'RNC Co-Chair', name: 'Lara Trump', since: '2024' },
        { title: 'Senate Minority Leader', name: 'Mitch McConnell', since: '2007' }
      ],
      description: 'The Republican Party, also known as the GOP (Grand Old Party), is one of the two major contemporary political parties in the United States.',
      history: 'Founded in 1854 by anti-slavery activists, the Republican Party has evolved to become the more conservative of the two major U.S. political parties, advocating for free market capitalism, limited government, and traditional values.',
      website: 'https://www.gop.com',
      socialMedia: {
        twitter: '@GOP',
        facebook: 'GOP',
        instagram: '@gop'
      }
    },
    {
      id: 'ind',
      code: 'IND',
      name: 'Independent',
      fullName: 'Independent',
      abbreviations: ['IND', 'I', 'Ind'],
      aliases: ['Independents', 'Non-partisan'],
      color: '#9333EA',
      colors: {
        primary: '#9333EA',
        secondary: '#7C3AED',
        light: '#C084FC',
        dark: '#6B21A8'
      },
      description: 'Independent candidates are not affiliated with any political party.',
      history: 'Independent candidates have played significant roles in American politics, often bringing fresh perspectives and challenging the two-party system. Notable independents include George Washington, who served as the first and only independent President.'
    },
    {
      id: 'grn',
      code: 'GRN',
      name: 'Green Party',
      fullName: 'Green Party of the United States',
      abbreviations: ['GRN', 'G', 'Green'],
      aliases: ['Greens', 'GPUS'],
      color: '#17B169',
      colors: {
        primary: '#17B169',
        secondary: '#10B981',
        light: '#34D399',
        dark: '#059669'
      },
      founded: '1984',
      ideology: 'Green politics, environmentalism, social justice, grassroots democracy',
      headquarters: 'Washington, D.C.',
      description: 'The Green Party of the United States is a federation of Green state political parties in the United States.',
      history: 'The Green Party was founded in 1984 and has focused on environmentalism, non-violence, social justice, and grassroots organizing. The party\'s platform is based on the Four Pillars: ecological wisdom, social justice, grassroots democracy, and non-violence.',
      website: 'https://www.gp.org',
      socialMedia: {
        twitter: '@GreenPartyUS',
        facebook: 'GreenParty'
      }
    }
  ]
};
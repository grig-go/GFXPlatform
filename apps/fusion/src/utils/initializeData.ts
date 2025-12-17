import { initializeDemographicData } from './api';
import { seedAIInfraData } from './aiInfraApi';

// Age data
const houseAgeData = [
  { name: '50-59', value: 104, percentage: 23.9, color: '#8B6F47' },
  { name: '60-69', value: 114, percentage: 26.2, color: '#6B4423' },
  { name: '40-49', value: 96, percentage: 22.1, color: '#C19A6B' },
  { name: '70-79', value: 71, percentage: 16.3, color: '#B8A4D4' },
  { name: '30-39', value: 35, percentage: 8.05, color: '#8DB48C' },
  { name: '20-29', value: 13, percentage: 2.99, color: '#B8D4B8' },
];

const senateAgeData = [
  { name: '60-69', value: 33, percentage: 33, color: '#6B4423' },
  { name: '70-79', value: 27, percentage: 27, color: '#B8A4D4' },
  { name: '50-59', value: 21, percentage: 21, color: '#8B6F47' },
  { name: '40-49', value: 10, percentage: 10, color: '#C19A6B' },
  { name: '80-89', value: 5, percentage: 5, color: '#64748B' },
  { name: '30-39', value: 2, percentage: 2, color: '#8DB48C' },
  { name: '20-29', value: 1, percentage: 1, color: '#B8D4B8' },
  { name: '90+', value: 1, percentage: 1, color: '#1E293B' },
];

// Race/ethnicity data by chamber
const houseRaceData = [
  { name: 'White', value: 66, percentage: 66, color: '#1e3a8a' },
  { name: 'Black', value: 15, percentage: 15, color: '#f59e0b' },
  { name: 'Hispanic/Latino', value: 10, percentage: 10, color: '#fef3c7' },
  { name: 'Asian/Pacific Islander/Native Hawaiian', value: 6, percentage: 6, color: '#8b5cf6' },
  { name: 'Other', value: 1, percentage: 1, color: '#10b981' },
  { name: 'American Indian/Alaska Native', value: 1, percentage: 1, color: '#ef4444' },
  { name: 'Multiracial', value: 1, percentage: 1, color: '#ec4899' },
];

const senateRaceData = [
  { name: 'White', value: 93, percentage: 93, color: '#1e3a8a' },
  { name: 'Black', value: 2, percentage: 2, color: '#f59e0b' },
  { name: 'Hispanic/Latino', value: 3, percentage: 3, color: '#fef3c7' },
  { name: 'Asian/Pacific Islander/Native Hawaiian', value: 1, percentage: 1, color: '#8b5cf6' },
  { name: 'Other', value: 1, percentage: 1, color: '#10b981' },
];

// Education data
const houseEducationData = [
  { name: 'Other', value: 195, percentage: 44.8, color: '#F4C430' },
  { name: 'Harvard', value: 48, percentage: 11.0, color: '#2D1B52' },
  { name: 'U. of California, Los Angeles', value: 20, percentage: 4.6, color: '#2D9CDB' },
  { name: 'Stanford', value: 18, percentage: 4.1, color: '#E57A3C' },
  { name: 'Georgetown', value: 16, percentage: 3.7, color: '#C04848' },
  { name: 'Brigham Young U.', value: 15, percentage: 3.4, color: '#4A9B8E' },
  { name: 'Cornell U.', value: 14, percentage: 3.2, color: '#E67E3C' },
  { name: 'U. of Virginia', value: 13, percentage: 3.0, color: '#E87722' },
  { name: 'U. of Texas', value: 12, percentage: 2.8, color: '#5FA8D3' },
  { name: 'U. of Florida', value: 11, percentage: 2.5, color: '#32A467' },
  { name: 'Dartmouth College', value: 10, percentage: 2.3, color: '#00693E' },
  { name: 'U. of North Carolina', value: 9, percentage: 2.1, color: '#13294B' },
  { name: 'Yale', value: 8, percentage: 1.8, color: '#C8102E' },
  { name: 'Ohio State U.', value: 7, percentage: 1.6, color: '#1F4E78' },
];

const senateEducationData = [
  { name: 'Other', value: 38, percentage: 38.0, color: '#F4C430' },
  { name: 'Harvard U.', value: 22, percentage: 22.0, color: '#2D1B52' },
  { name: 'Yale U.', value: 16, percentage: 16.0, color: '#C8102E' },
  { name: 'Georgetown U.', value: 8, percentage: 8.0, color: '#6BA3D0' },
  { name: 'Stanford U.', value: 6, percentage: 6.0, color: '#D2691E' },
  { name: 'Wisconsin', value: 4, percentage: 4.0, color: '#8B4789' },
  { name: 'Brigham Young U.', value: 3, percentage: 3.0, color: '#4A9B8E' },
  { name: 'U. of Virginia', value: 3, percentage: 3.0, color: '#E87722' },
];

// Years in office data
const yearsInOfficeData = [
  { range: '1-4', house: 28.0, senate: 12.0 },
  { range: '4-6', house: 18.0, senate: 8.0 },
  { range: '7-13', house: 20.0, senate: 15.0 },
  { range: '11-15', house: 12.0, senate: 14.0 },
  { range: '16-20', house: 8.0, senate: 12.0 },
  { range: '21-30', house: 9.0, senate: 15.0 },
  { range: '31-39', house: 3.0, senate: 3.0 },
  { range: '40+', house: 2.0, senate: 3.0 },
];



export async function initializeBackendData() {
  try {
    console.log('Initializing backend data...');
    
    const result = await initializeDemographicData({
      age: {
        house: { data: houseAgeData, averageAge: '57.3' },
        senate: { data: senateAgeData, averageAge: '64.0' },
      },
      race: {
        house: { data: houseRaceData },
        senate: { data: senateRaceData },
      },
      education: {
        house: { data: houseEducationData },
        senate: { data: senateEducationData },
      },
      office: {
        data: yearsInOfficeData,
      },
    });
    
    console.log('Backend data initialized successfully:', result);
    
    // Initialize AI Infrastructure data
    try {
      console.log('Seeding AI Infrastructure data...');
      await seedAIInfraData();
      console.log('AI Infrastructure data seeded successfully');
    } catch (error) {
      console.log('AI Infrastructure data already exists or error seeding:', error);
    }
    
    return result;
  } catch (error) {
    console.error('Failed to initialize backend data:', error);
    throw error;
  }
}

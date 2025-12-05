import { describe, it, expect } from 'vitest';
import {
  WEATHER_ICONS,
  getWeatherIcon,
  getWeatherIconsByCategory,
  getWeatherIconsByLibrary,
  getWeatherIconCategories,
  getWeatherIconLibraries,
  isValidWeatherIcon,
  getWeatherIconNamesForAI,
} from './weatherIcons';

describe('weatherIcons', () => {
  describe('WEATHER_ICONS array', () => {
    it('should contain animated icons from react-animated-weather', () => {
      const animatedIcons = WEATHER_ICONS.filter(icon => icon.library === 'animated');
      expect(animatedIcons.length).toBeGreaterThan(0);

      // Check that animated icons have the correct structure
      animatedIcons.forEach(icon => {
        expect(icon.animated).toBe(true);
        expect(icon.animatedIcon).toBeDefined();
        expect(icon.svgUrl).toBe(''); // Animated icons have empty svgUrl
      });
    });

    it('should contain meteocons icons', () => {
      const meteocons = WEATHER_ICONS.filter(icon => icon.library === 'meteocons');
      expect(meteocons.length).toBeGreaterThan(0);

      // Check meteocons naming pattern
      const meteoconsPattern = meteocons.filter(icon => icon.name.startsWith('meteocons-'));
      expect(meteoconsPattern.length).toBe(meteocons.length);
    });

    it('should contain weather-icons from Erik Flowers', () => {
      const weatherIcons = WEATHER_ICONS.filter(icon => icon.library === 'weather-icons');
      expect(weatherIcons.length).toBeGreaterThan(0);

      // Check weather-icons naming pattern
      const wiPattern = weatherIcons.filter(icon => icon.name.startsWith('wi-'));
      expect(wiPattern.length).toBe(weatherIcons.length);
    });

    it('should contain basicons icons', () => {
      const basicons = WEATHER_ICONS.filter(icon => icon.library === 'basicons');
      expect(basicons.length).toBeGreaterThan(0);
    });

    it('should have all icons with required properties', () => {
      WEATHER_ICONS.forEach(icon => {
        expect(icon.name).toBeDefined();
        expect(icon.displayName).toBeDefined();
        expect(icon.category).toBeDefined();
        expect(icon.library).toBeDefined();
        expect(icon.svgUrl).toBeDefined(); // Can be empty for animated
      });
    });
  });

  describe('getWeatherIcon', () => {
    it('should find animated weather icon by name', () => {
      const icon = getWeatherIcon('animated-clear-day');
      expect(icon).toBeDefined();
      expect(icon?.animated).toBe(true);
      expect(icon?.animatedIcon).toBe('CLEAR_DAY');
      expect(icon?.category).toBe('Clear');
    });

    it('should find meteocons icon by name', () => {
      const icon = getWeatherIcon('meteocons-1');
      expect(icon).toBeDefined();
      expect(icon?.library).toBe('meteocons');
      expect(icon?.displayName).toBe('Sun');
    });

    it('should find weather-icons icon by name', () => {
      const icon = getWeatherIcon('wi-day-sunny');
      expect(icon).toBeDefined();
      expect(icon?.library).toBe('weather-icons');
    });

    it('should return undefined for non-existent icon', () => {
      const icon = getWeatherIcon('non-existent-icon');
      expect(icon).toBeUndefined();
    });
  });

  describe('getWeatherIconsByCategory', () => {
    it('should return icons for Clear category', () => {
      const clearIcons = getWeatherIconsByCategory('Clear');
      expect(clearIcons.length).toBeGreaterThan(0);
      clearIcons.forEach(icon => {
        expect(icon.category).toBe('Clear');
      });
    });

    it('should return icons for Rain category', () => {
      const rainIcons = getWeatherIconsByCategory('Rain');
      expect(rainIcons.length).toBeGreaterThan(0);
    });

    it('should return icons for Storm category', () => {
      const stormIcons = getWeatherIconsByCategory('Storm');
      expect(stormIcons.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent category', () => {
      const icons = getWeatherIconsByCategory('NonExistentCategory');
      expect(icons).toEqual([]);
    });
  });

  describe('getWeatherIconsByLibrary', () => {
    it('should return all animated icons', () => {
      const animated = getWeatherIconsByLibrary('animated');
      expect(animated.length).toBeGreaterThan(0);
      animated.forEach(icon => {
        expect(icon.library).toBe('animated');
      });
    });

    it('should return all meteocons icons', () => {
      const meteocons = getWeatherIconsByLibrary('meteocons');
      expect(meteocons.length).toBeGreaterThan(0);
    });

    it('should return all weather-icons', () => {
      const weatherIcons = getWeatherIconsByLibrary('weather-icons');
      expect(weatherIcons.length).toBeGreaterThan(0);
    });

    it('should return all basicons', () => {
      const basicons = getWeatherIconsByLibrary('basicons');
      expect(basicons.length).toBeGreaterThan(0);
    });
  });

  describe('getWeatherIconCategories', () => {
    it('should return all unique categories', () => {
      const categories = getWeatherIconCategories();
      expect(categories).toContain('Clear');
      expect(categories).toContain('Cloudy');
      expect(categories).toContain('Rain');
      expect(categories).toContain('Snow');
      expect(categories).toContain('Storm');
      expect(categories).toContain('Wind');
      expect(categories).toContain('Fog');
      expect(categories).toContain('Temperature');
    });

    it('should not have duplicate categories', () => {
      const categories = getWeatherIconCategories();
      const uniqueCategories = [...new Set(categories)];
      expect(categories.length).toBe(uniqueCategories.length);
    });
  });

  describe('getWeatherIconLibraries', () => {
    it('should return all libraries in correct order', () => {
      const libraries = getWeatherIconLibraries();
      expect(libraries).toEqual(['animated', 'meteocons', 'weather-icons', 'basicons']);
    });

    it('should have animated as first library (default)', () => {
      const libraries = getWeatherIconLibraries();
      expect(libraries[0]).toBe('animated');
    });
  });

  describe('isValidWeatherIcon', () => {
    it('should return true for valid animated icon', () => {
      expect(isValidWeatherIcon('animated-clear-day')).toBe(true);
    });

    it('should return true for valid meteocons icon', () => {
      expect(isValidWeatherIcon('meteocons-1')).toBe(true);
    });

    it('should return true for valid weather-icons icon', () => {
      expect(isValidWeatherIcon('wi-day-sunny')).toBe(true);
    });

    it('should return true for valid basicons icon', () => {
      expect(isValidWeatherIcon('basicons-sun-day')).toBe(true);
    });

    it('should return false for invalid icon name', () => {
      expect(isValidWeatherIcon('invalid-icon')).toBe(false);
    });
  });

  describe('getWeatherIconNamesForAI', () => {
    it('should return array of icon names', () => {
      const names = getWeatherIconNamesForAI();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBe(WEATHER_ICONS.length);
    });

    it('should include animated icon names', () => {
      const names = getWeatherIconNamesForAI();
      expect(names).toContain('animated-clear-day');
      expect(names).toContain('animated-rain');
    });

    it('should include meteocons names', () => {
      const names = getWeatherIconNamesForAI();
      expect(names).toContain('meteocons-1');
    });

    it('should include weather-icons names', () => {
      const names = getWeatherIconNamesForAI();
      expect(names).toContain('wi-day-sunny');
    });
  });

  describe('Icon URL paths', () => {
    it('should have correct meteocons path structure', () => {
      const icon = getWeatherIcon('meteocons-1');
      expect(icon?.svgUrl).toMatch(/\/icons\/weather\/meteocons\/\d+\.svg$/);
    });

    it('should have correct weather-icons path structure', () => {
      const icon = getWeatherIcon('wi-day-sunny');
      expect(icon?.svgUrl).toMatch(/\/icons\/weather\/weather-icons\/wi-.*\.svg$/);
    });

    it('should have correct basicons path structure', () => {
      const icon = getWeatherIcon('basicons-sun-day');
      expect(icon?.svgUrl).toMatch(/\/icons\/weather\/basicons\/.*\.svg$/);
    });
  });

  describe('Animated icons structure', () => {
    it('should have correct animatedIcon values for react-animated-weather', () => {
      const validAnimatedIcons = [
        'CLEAR_DAY',
        'CLEAR_NIGHT',
        'PARTLY_CLOUDY_DAY',
        'PARTLY_CLOUDY_NIGHT',
        'CLOUDY',
        'RAIN',
        'SLEET',
        'SNOW',
        'WIND',
        'FOG',
      ];

      const animatedIcons = WEATHER_ICONS.filter(icon => icon.animated);
      animatedIcons.forEach(icon => {
        expect(validAnimatedIcons).toContain(icon.animatedIcon);
      });
    });
  });
});

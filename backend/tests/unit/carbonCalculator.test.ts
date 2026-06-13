/**
 * Carbon Calculator Unit Tests
 * Tests emission calculation accuracy
 * @module tests/unit/carbonCalculator.test
 */

import CarbonCalculator, { EMISSION_FACTORS } from '../../src/services/carbonCalculator';

describe('CarbonCalculator Unit Tests', () => {
  describe('Transportation Calculations', () => {
    test('should calculate petrol car emissions correctly', () => {
      const distance = 10; // 10 km
      const emissions = CarbonCalculator.calculateTransportation('car', distance, 'PETROL');
      expect(emissions).toBe(2.1); // 10 * 0.21
    });

    test('should calculate electric car emissions correctly', () => {
      const distance = 10;
      const emissions = CarbonCalculator.calculateTransportation('car', distance, 'ELECTRIC');
      expect(emissions).toBe(0.5); // 10 * 0.05
    });

    test('should throw error for unknown fuel type', () => {
      expect(() => {
        CarbonCalculator.calculateTransportation('car', 10, 'UNKNOWN');
      }).toThrow();
    });
  });

  describe('Flight Calculations', () => {
    test('should calculate short flight emissions', () => {
      const distance = 500; // 500 km
      const emissions = CarbonCalculator.calculateFlight(distance, 'economy');
      expect(emissions).toBeCloseTo(127.5, 1);
    });

    test('should apply business class multiplier', () => {
      const distance = 500;
      const economyEmissions = CarbonCalculator.calculateFlight(distance, 'economy');
      const businessEmissions = CarbonCalculator.calculateFlight(distance, 'business');
      expect(businessEmissions).toBeCloseTo(economyEmissions * 2.7, 1);
    });
  });

  describe('Food Calculations', () => {
    test('should calculate beef emissions', () => {
      const quantity = 1; // 1 kg
      const emissions = CarbonCalculator.calculateFood('BEEF', quantity);
      expect(emissions).toBe(27.0);
    });

    test('should calculate vegetable emissions', () => {
      const quantity = 1;
      const emissions = CarbonCalculator.calculateFood('VEGETABLES', quantity);
      expect(emissions).toBe(0.2);
    });

    test('should throw error for unknown food type', () => {
      expect(() => {
        CarbonCalculator.calculateFood('UNKNOWN', 1);
      }).toThrow();
    });
  });

  describe('Electricity Calculations', () => {
    test('should calculate grid average electricity', () => {
      const kWh = 10;
      const emissions = CarbonCalculator.calculateElectricity(kWh, 'GRID_AVERAGE');
      expect(emissions).toBe(3.85); // 10 * 0.385
    });

    test('should calculate renewable electricity', () => {
      const kWh = 10;
      const emissions = CarbonCalculator.calculateElectricity(kWh, 'RENEWABLE');
      expect(emissions).toBe(0.5); // 10 * 0.05
    });
  });

  describe('Shopping Calculations', () => {
    test('should calculate clothing emissions', () => {
      const emissions = CarbonCalculator.calculateShopping('CLOTHING', 1);
      expect(emissions).toBe(5.5);
    });

    test('should use average for unknown items', () => {
      const emissions = CarbonCalculator.calculateShopping('UNKNOWN_ITEM', 1);
      expect(emissions).toBe(3.0); // Average
    });
  });

  describe('Equivalents Calculation', () => {
    test('should provide relatable carbon equivalents', () => {
      const equivalents = CarbonCalculator.getEquivalents(10);
      expect(equivalents).toHaveLength(4);
      expect(equivalents[0]!.name).toContain('car');
      expect(equivalents[1]!.name).toContain('trees');
    });

    test('should calculate accurate equivalent values', () => {
      const emission = 0.21; // 1 mile
      const equivalents = CarbonCalculator.getEquivalents(emission);
      expect(equivalents[0]!.quantity).toBeCloseTo(1, 0);
    });
  });

  describe('Reduction Tips', () => {
    test('should provide tips for transportation', () => {
      const tips = CarbonCalculator.getReductionTips('transportation');
      expect(tips.length).toBeGreaterThan(0);
      expect(tips[0]).toContain('carpool');
    });

    test('should provide tips for all categories', () => {
      const categories = ['transportation', 'energy', 'food', 'shopping', 'home'];
      categories.forEach(category => {
        const tips = CarbonCalculator.getReductionTips(category);
        expect(tips.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero distance', () => {
      const emissions = CarbonCalculator.calculateTransportation('car', 0, 'PETROL');
      expect(emissions).toBe(0);
    });

    test('should handle large quantities', () => {
      const emissions = CarbonCalculator.calculateFood('BEEF', 1000);
      expect(emissions).toBe(27000);
    });

    test('should handle very small quantities', () => {
      const emissions = CarbonCalculator.calculateFood('BEEF', 0.001);
      expect(emissions).toBeCloseTo(0.027, 3);
    });
  });
});

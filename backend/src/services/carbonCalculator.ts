/**
 * Carbon Emissions Calculator Service
 * Calculates accurate carbon footprint based on IPCC 2024 guidelines
 * @module services/carbonCalculator
 */

/**
 * Carbon emission factors (kg CO2e per unit)
 * Based on 2024 IPCC Climate Change Report
 */
export const EMISSION_FACTORS = {
  // Transportation (kg CO2e per km)
  CAR: {
    PETROL: 0.21,      // Average petrol car
    DIESEL: 0.192,     // Average diesel car
    HYBRID: 0.095,     // Hybrid vehicle
    ELECTRIC: 0.05,    // EV (including electricity generation)
    BUS: 0.089,        // Per passenger
    TRAIN: 0.041,      // Per passenger
    PLANE_SHORT: 0.255, // <920 km flights
    PLANE_MEDIUM: 0.195, // 920-3700 km
    PLANE_LONG: 0.195,  // >3700 km
  },

  // Energy (kg CO2e per kWh)
  ELECTRICITY: {
    GRID_AVERAGE: 0.385,
    RENEWABLE: 0.05,
    COAL: 0.82,
    NATURAL_GAS: 0.49,
  },

  // Food (kg CO2e per kg)
  FOOD: {
    BEEF: 27.0,
    LAMB: 39.2,
    PORK: 12.1,
    CHICKEN: 6.9,
    FISH: 5.6,
    DAIRY: 1.23,
    EGGS: 4.8,
    VEGETABLES: 0.2,
    FRUITS: 0.3,
    GRAINS: 0.16,
  },

  // Shopping & Goods (kg CO2e per item)
  SHOPPING: {
    CLOTHING: 5.5,
    ELECTRONICS: 85.0,
    FURNITURE: 20.0,
    BOOKS: 1.5,
    AVERAGE_ITEM: 3.0,
  },

  // Home Energy (kg CO2e per unit)
  HOME: {
    HEATING_OIL: 10.15, // Per liter
    NATURAL_GAS: 2.04,  // Per cubic meter
    WATER: 0.34,        // Per cubic meter
  },
};

/**
 * Activity carbon calculation interface
 */
export interface CarbonActivity {
  id: string;
  type: 'transportation' | 'energy' | 'food' | 'shopping' | 'home';
  category: string;
  quantity: number;
  unit: string;
  timestamp: Date;
  location?: string;
  userId: string;
}

/**
 * Carbon Calculation Result
 */
export interface CarbonResult {
  activityId: string;
  emissionInKgCO2e: number;
  breakdown: string;
  tips: string[];
  equivalents: CarbonEquivalent[];
}

/**
 * Carbon equivalents for user understanding
 */
export interface CarbonEquivalent {
  name: string;
  quantity: number;
  unit: string;
}

/**
 * CarbonCalculator service class
 * Provides methods to calculate emissions for various activities
 */
export class CarbonCalculator {
  /**
   * Calculate transportation emissions
   * @param vehicleType Type of vehicle
   * @param distance Distance traveled in km
   * @param fuelType Fuel type for non-EVs
   * @returns Emissions in kg CO2e
   */
  static calculateTransportation(
    vehicleType: string,
    distance: number,
    fuelType: string = 'PETROL'
  ): number {
    const factor = EMISSION_FACTORS.CAR[fuelType as keyof typeof EMISSION_FACTORS.CAR];
    if (!factor) {
      throw new Error(`Unknown fuel type: ${fuelType}`);
    }
    return distance * factor;
  }

  /**
   * Calculate aviation emissions with RFI multiplier
   * @param distance Distance in km
   * @param flightClass Economy, Business, or First
   * @returns Emissions in kg CO2e
   */
  static calculateFlight(distance: number, flightClass: string = 'economy'): number {
    let baseFactor = EMISSION_FACTORS.CAR.PLANE_SHORT;

    if (distance > 3700) {
      baseFactor = EMISSION_FACTORS.CAR.PLANE_LONG;
    } else if (distance > 920) {
      baseFactor = EMISSION_FACTORS.CAR.PLANE_MEDIUM;
    }

    // Class multiplier (RFI - Radiative Forcing Index)
    const classMultiplier: Record<string, number> = {
      economy: 1.0,
      business: 2.7,
      first: 5.5,
    };

    const multiplier = classMultiplier[flightClass.toLowerCase()] || 1.0;
    return distance * baseFactor * multiplier;
  }

  /**
   * Calculate food-related emissions
   * @param foodType Type of food
   * @param quantity Quantity in kg
   * @returns Emissions in kg CO2e
   */
  static calculateFood(foodType: string, quantity: number): number {
    const factor = EMISSION_FACTORS.FOOD[foodType.toUpperCase() as keyof typeof EMISSION_FACTORS.FOOD];
    if (!factor) {
      throw new Error(`Unknown food type: ${foodType}`);
    }
    return quantity * factor;
  }

  /**
   * Calculate home energy emissions
   * @param energyType Type of energy source
   * @param quantity Amount consumed
   * @returns Emissions in kg CO2e
   */
  static calculateHomeEnergy(energyType: string, quantity: number): number {
    const factor = EMISSION_FACTORS.HOME[energyType.toUpperCase() as keyof typeof EMISSION_FACTORS.HOME];
    if (!factor) {
      throw new Error(`Unknown energy type: ${energyType}`);
    }
    return quantity * factor;
  }

  /**
   * Calculate electricity usage emissions
   * @param kWh Kilowatt hours consumed
   * @param sourceType Type of electricity source
   * @returns Emissions in kg CO2e
   */
  static calculateElectricity(kWh: number, sourceType: string = 'GRID_AVERAGE'): number {
    const factor = EMISSION_FACTORS.ELECTRICITY[sourceType.toUpperCase() as keyof typeof EMISSION_FACTORS.ELECTRICITY];
    if (!factor) {
      throw new Error(`Unknown electricity source: ${sourceType}`);
    }
    return kWh * factor;
  }

  /**
   * Calculate shopping emissions
   * @param itemType Type of item purchased
   * @param quantity Number of items
   * @returns Emissions in kg CO2e
   */
  static calculateShopping(itemType: string, quantity: number = 1): number {
    const factor = EMISSION_FACTORS.SHOPPING[itemType.toUpperCase() as keyof typeof EMISSION_FACTORS.SHOPPING];
    if (!factor) {
      return quantity * EMISSION_FACTORS.SHOPPING.AVERAGE_ITEM;
    }
    return quantity * factor;
  }

  /**
   * Calculate carbon equivalents for user understanding
   * @param emissionInKgCO2e Total emission in kg CO2e
   * @returns Array of relatable equivalents
   */
  static getEquivalents(emissionInKgCO2e: number): CarbonEquivalent[] {
    return [
      {
        name: 'Miles driven in average car',
        quantity: Math.round((emissionInKgCO2e / 0.21) * 10) / 10,
        unit: 'miles',
      },
      {
        name: 'Tree seedlings grown for 10 years',
        quantity: Math.round((emissionInKgCO2e / 21.7) * 10) / 10,
        unit: 'trees',
      },
      {
        name: 'Smartphone charged',
        quantity: Math.round((emissionInKgCO2e / 0.061) * 10) / 10,
        unit: 'times',
      },
      {
        name: 'Air travel',
        quantity: Math.round((emissionInKgCO2e / 0.195) * 10) / 10,
        unit: 'km',
      },
    ];
  }

  /**
   * Get actionable tips for reduction
   * @param category Activity category
   * @returns Array of practical tips
   */
  static getReductionTips(category: string): string[] {
    const tips = {
      transportation: [
        'Consider carpool or public transportation',
        'Use electric or hybrid vehicles for daily commute',
        'Combine errands into one trip',
        'Work from home 1-2 days per week',
        'Use bike or walk for short distances',
      ],
      energy: [
        'Switch to renewable energy sources',
        'Install LED bulbs throughout your home',
        'Improve home insulation',
        'Use programmable thermostat',
        'Unplug devices when not in use',
      ],
      food: [
        'Reduce meat consumption',
        'Choose locally sourced products',
        'Support organic and sustainable farming',
        'Minimize food waste',
        'Try plant-based meals',
      ],
      shopping: [
        'Buy secondhand items',
        'Choose sustainable brands',
        'Reduce overall consumption',
        'Support eco-friendly companies',
        'Buy durable products',
      ],
      home: [
        'Install solar panels',
        'Use rainwater collection',
        'Fix water leaks promptly',
        'Upgrade to efficient appliances',
        'Switch to renewable heating',
      ],
    };

    return tips[category as keyof typeof tips] || [
      'Track your activities to identify high-impact areas',
      'Set reduction goals and monitor progress',
    ];
  }
}

export default CarbonCalculator;

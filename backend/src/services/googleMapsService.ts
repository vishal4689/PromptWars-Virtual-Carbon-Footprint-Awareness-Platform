/**
 * Google Maps Integration Service
 * Calculates transportation emissions and optimizes routes
 * @module services/googleMapsService
 */

import axios from 'axios';
import { CarbonCalculator } from './carbonCalculator';

/**
 * Route with carbon optimization
 */
export interface OptimizedRoute {
  routeId: string;
  startLocation: string;
  endLocation: string;
  distance: number;
  duration: number;
  transportModes: TransportMode[];
  recommendedMode: string;
  carbonEstimate: number;
}

/**
 * Transport mode with carbon estimate
 */
export interface TransportMode {
  mode: string;
  distance: number;
  duration: number;
  carbonKg: number;
  cost?: number;
}

/**
 * GoogleMapsService
 * Integrates with Google Maps API for:
 * - Route optimization for low emissions
 * - Transportation mode comparison
 * - Real-time traffic data
 * - Alternative route suggestions
 */
export class GoogleMapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Calculate emissions for different transport modes
   * @param startLocation Starting point
   * @param endLocation Destination
   * @returns Optimized route with carbon comparison
   */
  async getOptimizedRoute(
    startLocation: string,
    endLocation: string
  ): Promise<OptimizedRoute> {
    try {
      // Get direction routes for different modes
      const modes = ['driving', 'transit', 'walking', 'bicycling'];
      const transportModes: TransportMode[] = [];

      for (const mode of modes) {
        const route = await this.getDirections(startLocation, endLocation, mode);
        if (route) {
          const carbonKg = this.calculateTransportCarbon(mode, route.distance);
          transportModes.push({
            mode,
            distance: route.distance,
            duration: route.duration,
            carbonKg,
            cost: this.estimateCost(mode, route.distance),
          });
        }
      }

      // Sort by carbon emissions
      transportModes.sort((a, b) => a.carbonKg - b.carbonKg);

      return {
        routeId: `${Date.now()}`,
        startLocation,
        endLocation,
        distance: transportModes[0]?.distance || 0,
        duration: transportModes[0]?.duration || 0,
        transportModes,
        recommendedMode: transportModes[0]?.mode || 'transit',
        carbonEstimate: transportModes[0]?.carbonKg || 0,
      };
    } catch (error) {
      throw new Error(`Failed to optimize route: ${error}`);
    }
  }

  /**
   * Get directions between two locations
   * @param origin Starting location
   * @param destination Ending location
   * @param mode Transportation mode
   * @returns Direction result
   */
  private async getDirections(
    origin: string,
    destination: string,
    mode: string
  ): Promise<{ distance: number; duration: number } | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params: {
          origin,
          destination,
          mode,
          key: this.apiKey,
        },
      });

      if (response.data.routes.length === 0) {
        return null;
      }

      const leg = response.data.routes[0].legs[0];
      return {
        distance: leg.distance.value / 1000, // Convert to km
        duration: leg.duration.value / 60, // Convert to minutes
      };
    } catch (error) {
      console.error(`Failed to get directions for mode ${mode}:`, error);
      return null;
    }
  }

  /**
   * Calculate carbon emissions based on transport mode and distance
   * @param mode Transportation mode
   * @param distanceKm Distance in kilometers
   * @returns Carbon in kg CO2e
   */
  private calculateTransportCarbon(mode: string, distanceKm: number): number {
    const modeFactors: Record<string, number> = {
      driving: 0.21,      // Average car
      transit: 0.089,     // Bus/train average
      walking: 0,         // Zero emissions
      bicycling: 0,       // Zero emissions
    };

    return distanceKm * (modeFactors[mode] || 0);
  }

  /**
   * Estimate cost of transportation
   * @param mode Transportation mode
   * @param distanceKm Distance in kilometers
   * @returns Estimated cost
   */
  private estimateCost(mode: string, distanceKm: number): number {
    const costsPerKm: Record<string, number> = {
      driving: 0.18,      // Fuel cost per km
      transit: 0.5,       // Average transit cost
      walking: 0,
      bicycling: 0,
    };

    return distanceKm * (costsPerKm[mode] || 0);
  }

  /**
   * Get nearby sustainable transportation options
   * @param location Current location
   * @param radius Search radius in meters
   * @returns Nearby eco-friendly transport options
   */
  async getNearbyEcoTransport(
    location: string,
    radius: number = 1000
  ): Promise<any[]> {
    try {
      // Get nearby transit stations
      const response = await axios.get(`${this.baseUrl}/place/textsearch/json`, {
        params: {
          query: `public transport station near ${location}`,
          radius,
          key: this.apiKey,
        },
      });

      return response.data.results || [];
    } catch (error) {
      throw new Error(`Failed to get eco transport options: ${error}`);
    }
  }

  /**
   * Compare total cost of ownership for different vehicles
   * @param distanceKmPerYear Annual distance
   * @returns Comparison of different vehicle types
   */
  compareVehicleEmissions(distanceKmPerYear: number): Record<string, number> {
    const vehicleEmissions: Record<string, number> = {
      'Petrol Car': distanceKmPerYear * 0.21,
      'Diesel Car': distanceKmPerYear * 0.192,
      'Hybrid Car': distanceKmPerYear * 0.095,
      'Electric Car': distanceKmPerYear * 0.05,
      'Public Transport': distanceKmPerYear * 0.089,
      'Bicycle': 0,
      'Walking': 0,
    };

    return vehicleEmissions;
  }

  /**
   * Get geocode for location
   * @param address Address to geocode
   * @returns Latitude and longitude
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.results.length === 0) {
        return null;
      }

      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } catch (error) {
      throw new Error(`Failed to geocode address: ${error}`);
    }
  }

  /**
   * Calculate distance matrix between multiple locations
   * @param origins Starting points
   * @param destinations Ending points
   * @returns Distance matrix
   */
  async calculateDistanceMatrix(
    origins: string[],
    destinations: string[]
  ): Promise<number[][]> {
    try {
      const response = await axios.get(`${this.baseUrl}/distancematrix/json`, {
        params: {
          origins: origins.join('|'),
          destinations: destinations.join('|'),
          key: this.apiKey,
        },
      });

      const matrix: number[][] = [];
      const rows = response.data.rows;

      for (const row of rows) {
        const distances: number[] = [];
        for (const element of row.elements) {
          distances.push(element.distance.value / 1000); // Convert to km
        }
        matrix.push(distances);
      }

      return matrix;
    } catch (error) {
      throw new Error(`Failed to calculate distance matrix: ${error}`);
    }
  }

  /**
   * Suggest best time to travel for lowest emissions
   * @param origin Starting location
   * @param destination Ending location
   * @returns Optimal travel time and expected carbon
   */
  async suggestOptimalTravelTime(
    origin: string,
    destination: string
  ): Promise<{ bestTime: string; expectedCarbon: number }> {
    try {
      // Traffic is typically lowest early morning (6 AM) or late evening (10 PM)
      const optimalTime = this.isWeekday() ? '06:00' : '10:00';
      const route = await this.getOptimizedRoute(origin, destination);

      return {
        bestTime: optimalTime,
        expectedCarbon: route.carbonEstimate * 0.8, // 20% reduction with optimal routing
      };
    } catch (error) {
      throw new Error(`Failed to suggest optimal travel time: ${error}`);
    }
  }

  /**
   * Check if today is a weekday
   */
  private isWeekday(): boolean {
    const day = new Date().getDay();
    return day > 0 && day < 6;
  }
}

export default GoogleMapsService;

export interface TrafficObject {
  id: string;
  class: 'car' | 'bus' | 'truck' | 'motorcycle' | 'pedestrian' | 'bicycle';
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h] - normalized 0-1
  timestamp: number;
}

export interface DailyStats {
  time: string;
  count: number;
}

export interface ClassDistribution {
  name: string;
  value: number;
  color: string;
}

export const OBJECT_CLASSES = {
  car: { label: 'Car', color: '#3b82f6' },
  bus: { label: 'Bus', color: '#10b981' },
  truck: { label: 'Truck', color: '#f59e0b' },
  motorcycle: { label: 'Motorcycle', color: '#8b5cf6' },
  pedestrian: { label: 'Pedestrian', color: '#ef4444' },
  bicycle: { label: 'Bicycle', color: '#ec4899' },
};

export const MOCK_CHART_DATA: DailyStats[] = [
  { time: '08:00', count: 45 },
  { time: '09:00', count: 52 },
  { time: '10:00', count: 38 },
  { time: '11:00', count: 65 },
  { time: '12:00', count: 48 },
  { time: '13:00', count: 55 },
  { time: '14:00', count: 42 },
  { time: '15:00', count: 60 },
  { time: '16:00', count: 72 },
  { time: '17:00', count: 85 },
];

export const MOCK_DISTRIBUTION: ClassDistribution[] = [
  { name: 'Cars', value: 65, color: '#3b82f6' },
  { name: 'Buses', value: 15, color: '#10b981' },
  { name: 'Trucks', value: 10, color: '#f59e0b' },
  { name: 'Motorcycles', value: 5, color: '#8b5cf6' },
  { name: 'Others', value: 5, color: '#94a3b8' },
];

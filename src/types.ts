
export type UserRole = 'admin' | 'staff';

export type EmployeePosition = 'Lễ tân' | 'Vệ sinh' | 'Bảo vệ' | 'Kế toán' | 'Kỹ thuật' | 'Quản lý' | 'Bếp';

export type RoomStatus = 'available' | 'booked' | 'occupied' | 'cleaning' | 'maintenance';

export interface User {
  username: string;
  role: UserRole;
  fullName: string;
  position?: EmployeePosition;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat?: number;
  lng?: number;
}

export interface Room {
  id: string;
  branchId: string;
  number: string;
  type: 'Single' | 'Double' | 'Suite' | 'Deluxe';
  price: number;
  status: RoomStatus;
  cleanStatus?: 'vệ sinh xong' | 'chưa vệ sinh';
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  idCard: string; // CCCD
}

export interface Service {
  id: string;
  name: string;
  price: number;
  category?: string;
  stock?: number;
}

export interface Booking {
  id: string;
  roomId: string;
  branchId: string;
  guest: Guest;
  checkIn: string; // ISO string
  checkOut: string; // ISO string
  actualCheckIn?: string;
  actualCheckOut?: string;
  status: 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  totalPrice: number;
  receivedAmount?: number;
  deposit?: number;
  services?: Service[];
  notes?: string;
  isExtended?: boolean;
  originalCheckOut?: string;
  history?: any[];
  createdAt?: string;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  type: 'cash' | 'bank' | 'ewallet';
}

export interface Transaction {
  id: string;
  walletId: string;
  branchId?: string;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  date: string;
  description: string;
  paymentMethod?: string;
  bookingId?: string;
}

export const INITIAL_WALLETS: Wallet[] = [
  { id: 'w1', name: 'Tiền mặt', balance: 0, type: 'cash' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export interface HistoryLog {
  id: string;
  type: 'booking' | 'cleaning' | 'attendance';
  roomId?: string;
  roomNumber?: string;
  userId: string;
  userName: string;
  timestamp: string;
  action: string;
  notes?: string;
  details?: string;
  isRead?: boolean;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  type: 'check-in' | 'check-out';
  timestamp: string;
  lat: number;
  lng: number;
  distance: number;
  status: 'valid' | 'invalid';
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  username?: string;
  password?: string;
  role: UserRole;
  position: EmployeePosition;
  salary: number;
  startDate: string;
  branchIds: string[];
  status: 'active' | 'inactive';
}

export const EMPLOYEE_POSITIONS: EmployeePosition[] = ['Lễ tân', 'Vệ sinh', 'Bảo vệ', 'Kế toán', 'Kỹ thuật', 'Quản lý', 'Bếp'];

export const INITIAL_EMPLOYEES: Employee[] = [
  { 
    id: 'e1', 
    name: 'Amigo Admin', 
    phone: '0901234567', 
    username: 'admin', 
    password: '123',
    role: 'admin', 
    position: 'Quản lý',
    salary: 20000000, 
    startDate: '2025-01-01', 
    branchIds: ['all'],
    status: 'active'
  }
];

export const ADDITIONAL_SERVICES: Service[] = [
  { id: 's1', name: 'Nước suối', price: 15000 },
  { id: 's2', name: 'Giặt ủi', price: 50000 },
];

export const ROOM_TYPES = ['Single', 'Double', 'Suite', 'Deluxe'] as const;

export const INITIAL_BRANCHES: Branch[] = [];

export const INITIAL_ROOMS: Room[] = [];

export const INITIAL_BOOKINGS: Booking[] = [];

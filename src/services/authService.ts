import { User } from '../types';
import { hotelService } from './hotelService';

const SESSION_KEY = 'hotel_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

export const authService = {
  login: (username: string, password: string): User | null => {
    let user: User | null = null;
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    console.log(`Attempting login for: ${cleanUsername}`);

    if (cleanUsername === 'admin' && (cleanPassword === 'admin' || cleanPassword === '123')) {
      user = { username: 'admin', role: 'admin', fullName: 'Amigo Admin' };
    } else {
      const employees = hotelService.getEmployees();
      console.log(`Checking against ${employees.length} employees`);
      
      const employee = employees.find(e => 
        e.username?.toString().trim().toLowerCase() === cleanUsername && 
        e.password?.toString().trim() === cleanPassword && 
        e.status === 'active'
      );
      
      if (employee) {
        user = { 
          username: employee.username!, 
          role: employee.role || (employee.position === 'Quản lý' ? 'admin' : 'staff'), 
          fullName: employee.name, 
          position: employee.position 
        };
      } else {
        console.warn("Login failed: User not found or incorrect password");
      }
    }

    if (user) {
      const expiry = Date.now() + SESSION_DURATION;
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user, expiry }));
      return user;
    }

    return null;
  },

  getCurrentUser: (): User | null => {
    const sessionDoc = localStorage.getItem(SESSION_KEY);
    if (!sessionDoc) return null;

    const { user, expiry } = JSON.parse(sessionDoc);
    if (Date.now() > expiry) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return user;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  }
};

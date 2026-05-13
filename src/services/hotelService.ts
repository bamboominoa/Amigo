import { format } from 'date-fns';
import { Branch, Room, Booking, HistoryLog, Wallet, Transaction, Employee, Attendance, INITIAL_BRANCHES, INITIAL_ROOMS, INITIAL_BOOKINGS, INITIAL_WALLETS, INITIAL_TRANSACTIONS, INITIAL_EMPLOYEES } from '../types';
import { sheetApi } from './api';

const STORAGE_KEYS = {
  BRANCHES: 'hotel_branches',
  ROOMS: 'hotel_rooms',
  BOOKINGS: 'hotel_bookings',
  LOGS: 'hotel_logs',
  WALLETS: 'hotel_wallets',
  TRANSACTIONS: 'hotel_transactions',
  EMPLOYEES: 'hotel_employees',
  ATTENDANCE: 'hotel_attendance',
  SERVICES: 'hotel_services',
};

export const hotelService = {
  // Method to fetch everything from Google Sheets
  async fetchAllData() {
    console.log("Fetching data from Google Sheets...");
    try {
      const data = await sheetApi.getAllData();
      if (data) {
        // Sync local storage with fetched data
        // We only use INITIAL data IF local storage is empty AND the fetched data is empty (first time run)
        
        const syncData = (sheetKey: string, storageKey: string, initialData: any, transform?: (item: any) => any) => {
          const sheetList = data[sheetKey];
          
          if (sheetList === undefined) {
             console.warn(`Sheet ${sheetKey} not found in remote data.`);
             return;
          }

          // If we have an array from the server, we use it to overwrite local storage.
          // This allows deletions on the server to be reflected in the app.
          // Exception: If remote is empty AND we have no local data yet, we use defaults.
          if (Array.isArray(sheetList)) {
            if (sheetList.length > 0) {
              console.log(`Syncing ${sheetKey}: Found ${sheetList.length} records.`);
              try {
                const processed = transform ? sheetList.map(transform) : sheetList;
                localStorage.setItem(storageKey, JSON.stringify(processed));
              } catch (err) {
                console.error(`Error transforming ${sheetKey}:`, err);
              }
            } else {
              // Remote is empty array
              const localData = localStorage.getItem(storageKey);
              if (!localData) {
                console.log(`No local data for ${sheetKey}, using defaults.`);
                localStorage.setItem(storageKey, JSON.stringify(initialData));
              } else if (localData && initialData && JSON.stringify(initialData) === localData) {
                // If local data is just the defaults and remote is empty, we keep defaults
              } else if (localData) {
                // IMPORTANT: If remote is empty but local has data, 
                // we should clear local data ONLY if we are sure the user wants to sync emptiness.
                // For now, let's allow it to clear if it's not the very first load.
                console.log(`Sheet ${sheetKey} is empty on remote. Clearing local cache.`);
                localStorage.setItem(storageKey, JSON.stringify([]));
              }
            }
          }
        };

        syncData('Employees', STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES, (e) => ({
          ...e,
          role: e.role || (e.position === 'Quản lý' ? 'admin' : 'staff')
        }));
        syncData('Branches', STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
        syncData('Rooms', STORAGE_KEYS.ROOMS, INITIAL_ROOMS, (r) => ({ 
          ...r, 
          price: Number(r.price),
          cleanStatus: r.cleanStatus || (r.status === 'cleaning' ? 'chưa vệ sinh' : 'vệ sinh xong')
        }));
        syncData('booking', STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS, (b) => {
          const safeParse = (val: any) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            try { return JSON.parse(val); } catch (e) { return []; }
          };
          
          return {
            ...b,
            totalPrice: Number(b.totalPrice || 0),
            deposit: Number(b.deposit || 0),
            receivedAmount: Number(b.receivedAmount || 0),
            services: safeParse(b.services),
            history: safeParse(b.history),
            guest: {
              id: b.id || b.roomId + b.checkIn,
              name: b.guestName || '',
              phone: b.guestPhone || '',
              idCard: b.guestIdCard || '',
            }
          };
        });
        syncData('Transactions', STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS, (t) => ({ 
          ...t, 
          amount: Number(t.amount),
          category: t.category || '',
          paymentMethod: t.paymentMethod || ''
        }));
        syncData('Services', STORAGE_KEYS.SERVICES, []);
        syncData('Wallets', STORAGE_KEYS.WALLETS, INITIAL_WALLETS, (w) => ({
          ...w,
          balance: Number(w.balance)
        }));
        syncData('Attendance', STORAGE_KEYS.ATTENDANCE, []);
        syncData('logs', STORAGE_KEYS.LOGS, []);
      }
    } catch (error) {
      console.error("Error in fetchAllData:", error);
      throw error;
    }
  },

  async resetData() {
    localStorage.clear();
    // We don't clear the sheet automatically for safety, but we clear local cache
    window.location.reload();
  },

  getEmployees: (): Employee[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    return JSON.parse(data);
  },

  saveEmployee: (employee: Employee) => {
    const employees = hotelService.getEmployees();
    const index = employees.findIndex(e => e.id === employee.id);
    if (index >= 0) {
      employees[index] = employee;
      sheetApi.updateRow('Employees', employee);
    } else {
      employees.push(employee);
      sheetApi.createRow('Employees', employee);
    }
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  deleteEmployee: (employeeId: string) => {
    const employees = hotelService.getEmployees();
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees.filter(e => e.id !== employeeId)));
    sheetApi.deleteRow('Employees', employeeId);
  },

  getBranches: (): Branch[] => {
    const data = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(INITIAL_BRANCHES));
      return INITIAL_BRANCHES;
    }
    return JSON.parse(data);
  },

  saveBranch: (branch: Branch) => {
    const branches = hotelService.getBranches();
    const index = branches.findIndex(b => b.id === branch.id);
    if (index >= 0) {
      branches[index] = branch;
      sheetApi.updateRow('Branches', branch);
    } else {
      branches.push(branch);
      sheetApi.createRow('Branches', branch);
    }
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
  },

  deleteBranch: (branchId: string) => {
    const branches = hotelService.getBranches().filter(b => b.id !== branchId);
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
    sheetApi.deleteRow('Branches', branchId);
    
    // Cleanup rooms
    const rooms = hotelService.getRooms().filter(r => r.branchId !== branchId);
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    
    // Note: Deleting rooms from sheet might require multiple API calls or a batch delete action
    // For now we rely on local cleanup and suggest the user syncs
    
    return branches;
  },

  getRooms: (): Room[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(INITIAL_ROOMS));
      return INITIAL_ROOMS;
    }
    return JSON.parse(data);
  },

  saveRoom: (room: Room) => {
    const rooms = hotelService.getRooms();
    const index = rooms.findIndex(r => r.id === room.id);
    if (index >= 0) {
      rooms[index] = room;
      sheetApi.updateRow('Rooms', room);
    } else {
      rooms.push(room);
      sheetApi.createRow('Rooms', room);
    }
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  },

  deleteRoom: (roomId: string) => {
    const rooms = hotelService.getRooms();
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms.filter(r => r.id !== roomId)));
    sheetApi.deleteRow('Rooms', roomId);
  },

  getServices: (): any[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SERVICES);
    return data ? JSON.parse(data) : [];
  },

  saveService: (service: any) => {
    const services = hotelService.getServices();
    const index = services.findIndex(s => s.id === service.id);
    if (index >= 0) {
      services[index] = service;
      sheetApi.updateRow('Services', service);
    } else {
      services.push(service);
      sheetApi.createRow('Services', service);
    }
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
  },

  deleteService: (serviceId: string) => {
    const services = hotelService.getServices().filter(s => s.id !== serviceId);
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
    sheetApi.deleteRow('Services', serviceId);
  },

  getBookings: (): Booking[] => {
    const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    return JSON.parse(data);
  },

  getLogs: (): HistoryLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  },

  addLog: (log: HistoryLog) => {
    const logs = hotelService.getLogs();
    logs.unshift(log); // Newest first
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    sheetApi.createRow('logs', log);
  },

  markLogAsRead: (logId: string) => {
    const logs = hotelService.getLogs();
    const index = logs.findIndex(l => l.id === logId);
    if (index >= 0) {
      logs[index].isRead = true;
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      sheetApi.updateRow('logs', logs[index]);
    }
  },

  getWallets: (): Wallet[] => {
    const data = localStorage.getItem(STORAGE_KEYS.WALLETS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(INITIAL_WALLETS));
      return INITIAL_WALLETS;
    }
    return JSON.parse(data);
  },

  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(data);
  },

  addTransaction: (transaction: Transaction) => {
    const transactions = hotelService.getTransactions();
    transactions.unshift(transaction); // Newest first
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    sheetApi.createRow('Transactions', transaction);

    // Update wallet balance
    const wallets = hotelService.getWallets();
    const walletIndex = wallets.findIndex(w => w.id === transaction.walletId);
    if (walletIndex >= 0) {
      if (transaction.type === 'income') {
        wallets[walletIndex].balance += transaction.amount;
      } else {
        wallets[walletIndex].balance -= transaction.amount;
      }
      localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
    }
  },

  saveBooking: (booking: Booking) => {
    const bookings = hotelService.getBookings();
    const index = bookings.findIndex(b => b.id === booking.id);
    
    // Convert booking to sheet format
    const sheetPayload = {
      id: booking.id,
      roomId: booking.roomId,
      branchId: booking.branchId,
      guestName: booking.guest.name,
      guestPhone: booking.guest.phone,
      guestIdCard: booking.guest.idCard,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status,
      deposit: booking.deposit || 0,
      services: booking.services || [],
      totalPrice: booking.totalPrice || 0,
      createdAt: new Date().toISOString()
    };

    if (index >= 0) {
      bookings[index] = booking;
      sheetApi.updateRow('booking', sheetPayload);
    } else {
      bookings.push(booking);
      sheetApi.createRow('booking', sheetPayload);
    }
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    
    // Update room status based on booking status
    const rooms = hotelService.getRooms();
    const roomIndex = rooms.findIndex(r => r.id === booking.roomId);
    if (roomIndex >= 0) {
      if (booking.status === 'checked-in') {
        rooms[roomIndex].status = 'occupied';
      } else if (booking.status === 'confirmed') {
        rooms[roomIndex].status = 'booked';
      } else if (booking.status === 'checked-out') {
        rooms[roomIndex].status = 'cleaning';
      } else if (booking.status === 'cancelled') {
        rooms[roomIndex].status = 'available';
      }
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
      sheetApi.updateRow('Rooms', rooms[roomIndex]);
    }
  },

  getAttendance: (): Attendance[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  },

  saveAttendance: (attendance: Attendance) => {
    const records = hotelService.getAttendance();
    records.unshift(attendance);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    sheetApi.createRow('Attendance', attendance);
    
    // Also log to history
    hotelService.addLog({
      id: 'att_' + Date.now(),
      type: 'attendance',
      userId: attendance.employeeId,
      userName: attendance.employeeName,
      timestamp: attendance.timestamp,
      action: attendance.type === 'check-in' ? 'Chấm công vào' : 'Chấm công ra',
      details: `${attendance.status === 'valid' ? 'Hợp lệ' : 'Không hợp lệ (ngoài bán kính)'} - Khoảng cách: ${Math.round(attendance.distance)}m`,
      isRead: false
    });
  },

  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  },

  updateRoomStatus: (roomId: string, status: Room['status']) => {
    const rooms = hotelService.getRooms();
    const index = rooms.findIndex(r => r.id === roomId);
    if (index >= 0) {
      rooms[index].status = status;
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
      sheetApi.updateRow('Rooms', rooms[index]);
    }
  }
};

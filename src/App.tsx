import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Hotel,
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  CalendarDays,
  Plus,
  RefreshCw,
  Lock,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  DoorOpen,
  Clock,
  CheckCircle2,
  CheckCircle,
  XCircle,
  ClipboardList,
  Check,
  Zap,
  History,
  Wallet as WalletIcon,
  Settings2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Bell,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Menu,
  X,
  MapPin,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  format,
  addDays,
  isWithinInterval,
  parseISO,
  differenceInDays,
  isBefore,
  startOfDay,
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { hotelService } from "./services/hotelService";
import { authService } from "./services/authService";
import {
  Branch,
  Room,
  Booking,
  RoomStatus,
  Employee,
  EMPLOYEE_POSITIONS,
  ADDITIONAL_SERVICES,
  Service,
  User,
  Wallet,
  Transaction,
  ROOM_TYPES,
} from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "rooms"
    | "timeline"
    | "bookings"
    | "guests"
    | "logs"
    | "room_manager"
    | "wallets"
    | "branches"
    | "employees"
  >("dashboard");
  const [timelineStartDate, setTimelineStartDate] = useState(startOfDay(new Date()));
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle vertical scroll to translate into horizontal
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [activeTab]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "income",
  );
  const [transactionAmount, setTransactionAmount] = useState<number>(0);
  const [transactionWalletId, setTransactionWalletId] = useState<string>("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewDate, setViewDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [dashboardDataUpdated, setDashboardDataUpdated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [apiError, setApiError] = useState<{message: string, detail?: string, debugUrl?: string, isAuthError?: boolean} | null>(null);

  // Modal States
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestIdCard, setGuestIdCard] = useState("");
  const [checkInDate, setCheckInDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [checkOutDate, setCheckOutDate] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd"),
  );
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [deposit, setDeposit] = useState<number>(0);
  const [paymentWalletId, setPaymentWalletId] = useState<string>("");
  const [isCleaningModalOpen, setIsCleaningModalOpen] = useState(false);
  const [cleaningNotes, setCleaningNotes] = useState("");
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedRoomIdForLog, setSelectedRoomIdForLog] = useState<string>("all");

  // Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const filteredLogs = useMemo(() => {
    if (selectedRoomIdForLog === "all") return activityLogs;
    return activityLogs.filter((log) => log.roomId === selectedRoomIdForLog);
  }, [activityLogs, selectedRoomIdForLog]);

  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        await hotelService.fetchAllData();
        setApiError(null);
      } catch (err: any) {
        console.error("Failed to fetch initial data", err);
        try {
          const errObj = JSON.parse(err.message);
          setApiError({ 
            message: errObj.error || "Lỗi kết nối Google Sheets", 
            detail: errObj.message || "Kiểm tra lại thiết lập Deployment trong Google Apps Script.",
            debugUrl: errObj.debug_url,
            isAuthError: errObj.is_auth_error
          });
        } catch (e) {
          setApiError({ message: "Không thể kết nối đến Google Sheets", detail: err.message });
        }
      } finally {
        const user = authService.getCurrentUser();
        if (user) setCurrentUser(user);
    
        const b = hotelService.getBranches();
        const r = hotelService.getRooms();
        const bo = hotelService.getBookings();
        const e = hotelService.getEmployees();
        const l = hotelService.getLogs();
        const w = hotelService.getWallets();
        const t = hotelService.getTransactions();
        setBranches(b);
        setRooms(r);
        setBookings(bo);
        setEmployees(e);
        setActivityLogs(l);
        setWallets(w);
        setTransactions(t);
        if (b.length > 0) setSelectedBranchId("all");
        setIsLoadingData(false);
      }
    };
    initData();
  }, []);

  const filteredRooms = useMemo(() => {
    if (selectedBranchId === "all") return rooms;
    return rooms.filter((r) => r.branchId === selectedBranchId);
  }, [rooms, selectedBranchId]);

  const getRoomStatusOnDate = (
    room: Room,
    dateStr: string,
  ): { status: RoomStatus; booking?: Booking } => {
    const roomBookings = bookings.filter(
      (b) =>
        b.roomId === room.id &&
        b.status !== "cancelled" &&
        b.status !== "checked-out",
    );

    // 1. Priority: Currently checked-in (stays occupied from check-in day onwards until check-out)
    const activeCheckedIn = roomBookings.find((b) => {
      if (b.status !== "checked-in") return false;
      const checkInDateOnly = format(parseISO(b.checkIn), "yyyy-MM-dd");
      return dateStr >= checkInDateOnly;
    });

    if (activeCheckedIn) {
      return {
        status: "occupied",
        booking: activeCheckedIn,
      };
    }

    // 2. Next: Confirmed bookings overlapping the target date
    const confirmedBooking = roomBookings.find((b) => {
      if (b.status !== "confirmed") return false;
      const checkInDateOnly = format(parseISO(b.checkIn), "yyyy-MM-dd");
      const checkOutDateOnly = format(parseISO(b.checkOut), "yyyy-MM-dd");
      return dateStr >= checkInDateOnly && dateStr < checkOutDateOnly;
    });

    if (confirmedBooking) {
      return {
        status: "booked",
        booking: confirmedBooking,
      };
    }

    const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
    // For today, we also check if room is currently in cleaning or maintenance state
    if (isToday) {
      if (room.status === "cleaning" || room.status === "maintenance") {
        return { status: room.status };
      }
    }

    return { status: "available" };
  };

  const roomsWithStatus = useMemo(() => {
    return filteredRooms.map((room) => {
      const { status, booking } = getRoomStatusOnDate(room, viewDate);
      return { ...room, displayStatus: status, activeBooking: booking };
    });
  }, [filteredRooms, viewDate, bookings]);

  const overdueBookings = useMemo(() => {
    const today = startOfDay(new Date());
    return bookings.filter((b) => {
      if (b.status !== "checked-in") return false;
      const checkOutDate = startOfDay(parseISO(b.checkOut));
      return isBefore(checkOutDate, today);
    });
  }, [bookings]);

  const cleaningNotifications = useMemo(() => {
    return activityLogs.filter(
      (log) =>
        log.type === "cleaning" &&
        log.notes &&
        log.notes.trim() !== "" &&
        !log.isRead,
    );
  }, [activityLogs]);

  const handleMarkLogAsRead = (logId: string) => {
    hotelService.markLogAsRead(logId);
    setActivityLogs(hotelService.getLogs());
  };

  const handleSaveRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomData: Room = {
      id: editingRoom?.id || `r${Date.now()}`,
      number: formData.get("number") as string,
      type: formData.get("type") as any,
      price: Number(formData.get("price")),
      branchId: formData.get("branchId") as string,
      status: editingRoom?.status || "available",
    };

    hotelService.saveRoom(roomData);
    setRooms(hotelService.getRooms());
    setIsRoomModalOpen(false);
  };

  const handleSaveBranch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const branchData: Branch = {
      id: editingBranch?.id || `b${Date.now()}`,
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
    };

    hotelService.saveBranch(branchData);
    setBranches(hotelService.getBranches());
    setIsBranchModalOpen(false);
  };

  const handleSaveEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const position = formData.get("position") as any;
    // Derive role from position: Quản lý gets admin role
    const role = position === "Quản lý" ? "admin" : "staff";

    const branchIds = formData.getAll("branchIds") as string[];

    const employeeData: Employee = {
      id: editingEmployee?.id || `e${Date.now()}`,
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      role: role,
      position: position,
      salary: Number(formData.get("salary")) * 1000,
      startDate: formData.get("startDate") as string,
      branchIds: branchIds,
      status: formData.get("status") as any,
    };

    hotelService.saveEmployee(employeeData);
    setEmployees(hotelService.getEmployees());
    setIsEmployeeModalOpen(false);
  };

  const dashboardData = useMemo(() => {
    // Current month revenue
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyIncome = transactions
      .filter((t) => {
        const d = parseISO(t.date);
        return (
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear &&
          t.type === "income"
        );
      })
      .reduce((acc, t) => acc + t.amount, 0);

    const monthlyExpense = transactions
      .filter((t) => {
        const d = parseISO(t.date);
        return (
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear &&
          t.type === "expense"
        );
      })
      .reduce((acc, t) => acc + t.amount, 0);

    // Revenue by day for last 7 days
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(now, -i);
      const dateStr = format(d, "dd/MM");
      const income = transactions
        .filter(
          (t) =>
            t.type === "income" &&
            format(parseISO(t.date), "dd/MM/yyyy") === format(d, "dd/MM/yyyy"),
        )
        .reduce((acc, t) => acc + t.amount, 0);
      dailyData.push({ name: dateStr, income });
    }

    // Room type distribution
    const roomTypeStats = [
      {
        name: "Single",
        value: rooms.filter((r) => r.type === "Single").length,
      },
      {
        name: "Double",
        value: rooms.filter((r) => r.type === "Double").length,
      },
      { name: "Suite", value: rooms.filter((r) => r.type === "Suite").length },
      {
        name: "Deluxe",
        value: rooms.filter((r) => r.type === "Deluxe").length,
      },
    ];

    return { monthlyIncome, monthlyExpense, dailyData, roomTypeStats };
  }, [transactions, rooms, dashboardDataUpdated]);

  const stats = useMemo(() => {
    const rws = roomsWithStatus;
    return {
      total: rws.length,
      available: rws.filter((r) => r.displayStatus === "available").length,
      occupied: rws.filter((r) => r.displayStatus === "occupied").length,
      booked: rws.filter((r) => r.displayStatus === "booked").length,
      cleaning: rws.filter((r) => r.displayStatus === "cleaning").length,
    };
  }, [roomsWithStatus]);

  const handleOpenBooking = (room: Room) => {
    setSelectedRoom(room);

    // Role/Position check for actions
    const isVệSinh = currentUser?.position === "Vệ sinh";
    const isLễTân = currentUser?.position === "Lễ tân";
    const isManager = currentUser?.role === "admin" || currentUser?.position === "Quản lý";

    if (room.status === "cleaning") {
      setIsCleaningModalOpen(true);
      return;
    }

    if (isVệSinh) {
      if (room.status === "occupied" || room.status === "booked") {
        alert("Bạn không tự ý vào phòng đang có khách hoặc đã được đặt");
        return;
      }
      // Allowed to start cleaning or show status
      setIsCleaningModalOpen(true);
      return;
    }

    if (!isManager && !isLễTân) {
      alert("Chức năng này chỉ dành cho Lễ tân hoặc Quản lý");
      return;
    }

    // Find booking for this room that overlaps viewDate
    const roomBookings = bookings.filter(
      (b) =>
        b.roomId === room.id &&
        b.status !== "cancelled" &&
        b.status !== "checked-out",
    );

    const bookingOnDate =
      roomBookings.find((b) => {
        if (b.status !== "checked-in") return false;
        const checkInDateOnly = format(parseISO(b.checkIn), "yyyy-MM-dd");
        return viewDate >= checkInDateOnly;
      }) ||
      roomBookings.find((b) => {
        const checkInDateOnly = format(parseISO(b.checkIn), "yyyy-MM-dd");
        const checkOutDateOnly = format(parseISO(b.checkOut), "yyyy-MM-dd");
        return viewDate >= checkInDateOnly && viewDate < checkOutDateOnly;
      });

    const activeBooking = bookingOnDate;

    if (activeBooking) {
      setSelectedBooking(activeBooking);
      setGuestName(activeBooking.guest.name);
      setGuestPhone(activeBooking.guest.phone);
      setGuestIdCard(activeBooking.guest.idCard);
      setCheckInDate(format(parseISO(activeBooking.checkIn), "yyyy-MM-dd"));
      setCheckOutDate(format(parseISO(activeBooking.checkOut), "yyyy-MM-dd"));
      setSelectedServices(activeBooking.services || []);
      setDeposit(activeBooking.deposit || 0);
    } else {
      setSelectedBooking(null);
      setGuestName("");
      setGuestPhone("");
      setGuestIdCard("");
      setCheckInDate(viewDate);
      setCheckOutDate(format(addDays(parseISO(viewDate), 1), "yyyy-MM-dd"));
      setSelectedServices([]);
      setDeposit(0);
    }
    setIsBookingModalOpen(true);
  };

  const handleSaveBooking = (status: Booking["status"]) => {
    if (!selectedRoom) return;

    const days = Math.max(
      1,
      differenceInDays(parseISO(checkOutDate), parseISO(checkInDate)),
    );
    const roomTotal = selectedRoom.price * days;
    const servicesTotal = selectedServices.reduce((acc, s) => acc + s.price, 0);

    const booking: Booking = {
      id: selectedBooking?.id || Math.random().toString(36).substr(2, 9),
      roomId: selectedRoom.id,
      branchId: selectedBranchId,
      guest: {
        id:
          selectedBooking?.guest.id || Math.random().toString(36).substr(2, 9),
        name: guestName,
        phone: guestPhone,
        idCard: guestIdCard,
      },
      checkIn: new Date(checkInDate).toISOString(),
      checkOut: new Date(checkOutDate).toISOString(),
      status: status,
      totalPrice: roomTotal + servicesTotal,
      deposit: deposit,
      services: selectedServices,
    };

    hotelService.saveBooking(booking);

    // Create transaction if payment is made
    let amountPaid = 0;

    // Scenarios for payment:
    // 1. New booking with deposit -> create transaction for deposit
    // 2. Checkout -> create transaction for remaining balance
    if (!selectedBooking && deposit > 0) {
      amountPaid = deposit; // initial deposit
    } else if (
      status === "checked-out" &&
      selectedBooking?.status !== "checked-out"
    ) {
      amountPaid = booking.totalPrice - (booking.deposit || 0); // final payment
    }

    if (amountPaid > 0) {
      if (!paymentWalletId) {
        // Fallback if no wallet selected: default to first wallet
        const fallbackWalletId = wallets[0]?.id || "w1";
        hotelService.addTransaction({
          id: Math.random().toString(36).substr(2, 9),
          walletId: fallbackWalletId,
          type: "income",
          amount: amountPaid,
          date: new Date().toISOString(),
          description: !selectedBooking
            ? `Cọc phòng ${selectedRoom.number} - ${guestName}`
            : `Thanh toán phòng ${selectedRoom.number} - ${guestName}`,
          bookingId: booking.id,
        });
      } else {
        hotelService.addTransaction({
          id: Math.random().toString(36).substr(2, 9),
          walletId: paymentWalletId,
          type: "income",
          amount: amountPaid,
          date: new Date().toISOString(),
          description: !selectedBooking
            ? `Cọc phòng ${selectedRoom.number} - ${guestName}`
            : `Thanh toán phòng ${selectedRoom.number} - ${guestName}`,
          bookingId: booking.id,
        });
      }
    }

    // Create log
    if (currentUser) {
      hotelService.addLog({
        id: Math.random().toString(36).substr(2, 9),
        type: "booking",
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.number,
        userId: currentUser.username,
        userName: currentUser.fullName,
        timestamp: new Date().toISOString(),
        action:
          status === "confirmed"
            ? "Đặt phòng"
            : status === "checked-in"
              ? "Nhận phòng"
              : status === "checked-out"
                ? "Trả phòng"
                : "Hủy phòng",
        notes: `Khách: ${guestName}`,
        details: JSON.stringify(booking),
      });
    }

    // Refresh states
    setRooms(hotelService.getRooms());
    setBookings(hotelService.getBookings());
    setActivityLogs(hotelService.getLogs());
    setWallets(hotelService.getWallets());
    setTransactions(hotelService.getTransactions());
    setIsBookingModalOpen(false);
  };

  const handleUpdateStatus = (status: RoomStatus, notes?: string) => {
    if (!selectedRoom) return;

    // Role check: staff can only change state from 'cleaning' to 'available'
    const isManager =
      currentUser?.role === "admin" || currentUser?.position === "Quản lý";
    const isVệSinh = currentUser?.position === "Vệ sinh";

    if (!isManager && isVệSinh) {
      if (!(selectedRoom.status === "cleaning" && status === "available")) {
        // Cleaning staff can also mark an available room as 'cleaning'
        if (!(selectedRoom.status === "available" && status === "cleaning")) {
          alert("Bạn chỉ được phép cập nhật trạng thái dọn dẹp");
          return;
        }
      }
    } else if (!isManager && !isVệSinh && currentUser?.position !== "Lễ tân") {
      alert("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    hotelService.updateRoomStatus(selectedRoom.id, status);

    // Create log
    if (currentUser) {
      hotelService.addLog({
        id: Math.random().toString(36).substr(2, 9),
        type: status === "available" ? "cleaning" : "booking",
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.number,
        userId: currentUser.username,
        userName: currentUser.fullName,
        timestamp: new Date().toISOString(),
        action:
          status === "available" ? "Hoàn tất dọn phòng" : "Cập nhật trạng thái",
        notes: notes || "",
      });
    }

    setRooms(hotelService.getRooms());
    setActivityLogs(hotelService.getLogs());
    setIsBookingModalOpen(false);
    setIsCleaningModalOpen(false);
    setCleaningNotes("");
  };

  const handleSaveTransaction = () => {
    if (
      !transactionWalletId ||
      transactionAmount <= 0 ||
      !transactionDescription
    ) {
      alert("Vui lòng điền đầy đủ thông tin giao dịch");
      return;
    }

    hotelService.addTransaction({
      id: Math.random().toString(36).substr(2, 9),
      walletId: transactionWalletId,
      type: transactionType,
      amount: transactionAmount,
      date: new Date().toISOString(),
      description: transactionDescription,
    });

    setWallets(hotelService.getWallets());
    setTransactions(hotelService.getTransactions());
    setDashboardDataUpdated((prev) => !prev); // Trigger dashboard refresh
    setIsTransactionModalOpen(false);
    // Reset form
    setTransactionAmount(0);
    setTransactionDescription("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = authService.login(username, password);
    if (user) {
      setCurrentUser(user);
      setLoginError("");
    } else {
      setLoginError("Sai tên đăng nhập hoặc mật khẩu");
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
          <p>Đang tải dữ liệu từ Google Sheets...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 bg-indigo-600 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Hotel size={32} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Amigo Đà Lạt</h2>
              <p className="text-indigo-100 text-sm mt-1">
                Hệ thống quản lý khách sạn chuyên nghiệp
              </p>
            </div>

            <form onSubmit={handleLogin} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="admin / laocong"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-medium flex items-center gap-2">
                  <XCircle size={14} />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 uppercase text-xs tracking-widest"
              >
                Đăng nhập hệ thống
              </button>
            </form>
          </div>
          <p className="text-center mt-8 text-slate-500 text-xs font-medium uppercase tracking-widest">
            © 2026 Amigo Đà Lạt Management System
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={cn(
          "w-64 bg-slate-900 flex flex-col shrink-0 text-slate-300 fixed inset-y-0 left-0 z-[100] transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-10",
          !isSidebarOpen && "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Hotel size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight">Amigo Đà Lạt</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

            <nav className="space-y-1">
              {(currentUser?.role === "admin" ||
                currentUser?.position === "Quản lý" ||
                currentUser?.position === "Lễ tân" ||
                currentUser?.position === "Kế toán" ||
                currentUser?.position === "Vệ sinh") && (
                <NavItem
                  icon={<LayoutDashboard size={20} />}
                  label="Bảng điều khiển"
                  active={activeTab === "dashboard"}
                  onClick={() => {
                    setActiveTab("dashboard");
                    setIsSidebarOpen(false);
                  }}
                />
              )}
              <NavItem
                icon={<DoorOpen size={20} />}
                label="Sơ đồ phòng"
                active={activeTab === "rooms"}
                onClick={() => {
                  setActiveTab("rooms");
                  setIsSidebarOpen(false);
                }}
              />
              {(currentUser?.role === "admin" ||
                currentUser?.position === "Quản lý" ||
                currentUser?.position === "Lễ tân") && (
                <NavItem
                  icon={<CalendarDays size={20} />}
                  label="Tình trạng đặt phòng"
                  active={activeTab === "timeline"}
                  onClick={() => {
                    setActiveTab("timeline");
                    setIsSidebarOpen(false);
                  }}
                />
              )}
              {(currentUser?.role === "admin" ||
                currentUser?.position === "Quản lý" ||
                currentUser?.position === "Lễ tân") && (
                <NavItem
                  icon={<ClipboardList size={20} />}
                  label="Danh sách đặt"
                  active={activeTab === "bookings"}
                  onClick={() => {
                    setActiveTab("bookings");
                    setIsSidebarOpen(false);
                  }}
                />
              )}
              {(currentUser?.role === "admin" ||
                currentUser?.position === "Quản lý" ||
                currentUser?.position === "Lễ tân") && (
                <NavItem
                  icon={<Users size={20} />}
                  label="Khách hàng"
                  active={activeTab === "guests"}
                  onClick={() => {
                    setActiveTab("guests");
                    setIsSidebarOpen(false);
                  }}
                />
              )}
              {(currentUser?.role === "admin" ||
                currentUser?.position === "Quản lý") && (
                <>
                  <NavItem
                    icon={<Settings2 size={20} />}
                    label="Quản lý phòng"
                    active={activeTab === "room_manager"}
                    onClick={() => {
                      setActiveTab("room_manager");
                      setIsSidebarOpen(false);
                    }}
                  />
                  <NavItem
                    icon={<WalletIcon size={20} />}
                    label="Sổ quỹ / Ví"
                    active={activeTab === "wallets"}
                    onClick={() => {
                      setActiveTab("wallets");
                      setIsSidebarOpen(false);
                    }}
                  />
                  <NavItem
                    icon={<MapPin size={20} />}
                    label="Hệ thống chi nhánh"
                    active={activeTab === "branches"}
                    onClick={() => {
                      setActiveTab("branches");
                      setIsSidebarOpen(false);
                    }}
                  />
                  <NavItem
                    icon={<Users size={20} />}
                    label="Quản lý nhân viên"
                    active={activeTab === "employees"}
                    onClick={() => {
                      setActiveTab("employees");
                      setIsSidebarOpen(false);
                    }}
                  />
                </>
              )}
              <NavItem
                icon={<Clock size={20} />}
                label="Lịch sử hoạt động"
                active={activeTab === "logs"}
                onClick={() => {
                  setActiveTab("logs");
                  setIsSidebarOpen(false);
                }}
              />
            </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
              {String(currentUser?.fullName || currentUser?.username || "")
                .split(" ")
                .map((n) => n?.[0] || "")
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {currentUser.fullName || currentUser.username}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                {currentUser.role === "admin"
                  ? "Quản trị viên"
                  : "Nhân viên vệ sinh"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 mt-4 text-[10px] font-black text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-widest"
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* API Error Banner */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-50 border-b border-amber-200 overflow-hidden relative z-50 shrink-0"
            >
              <div className="max-w-7xl mx-auto py-2.5 px-4 lg:px-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-1.5 rounded-lg">
                      {apiError.isAuthError ? <Lock className="w-4 h-4 text-amber-600 shrink-0" /> : <Bell className="w-4 h-4 text-amber-600 shrink-0" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-amber-900 leading-tight">
                        {apiError.message}
                      </span>
                      {apiError.detail && (
                        <div className="text-xs text-amber-700 leading-tight mt-1 whitespace-pre-line bg-white/50 p-2 rounded border border-amber-200/50">
                          {apiError.isAuthError && (
                            <p className="font-bold underline mb-1">Ứng dụng đang hiển thị "Dữ liệu mẫu" vì không thể kết nối đến Google Sheets của bạn.</p>
                          )}
                          {apiError.detail}
                          {apiError.debugUrl && (
                            <div className="mt-2 flex gap-2">
                              <a 
                                href={apiError.debugUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 underline font-bold text-amber-800"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Mở link kiểm tra
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button 
                    onClick={() => hotelService.resetData()}
                    className="px-3 py-1 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 text-xs font-bold rounded-lg transition-colors"
                  >
                    Xóa dữ liệu mẫu
                  </button>
                  <button 
                    onClick={() => {
                      setDashboardDataUpdated(prev => !prev);
                      hotelService.fetchAllData()
                        .then(() => setApiError(null))
                        .catch(() => {});
                    }}
                    className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Thử lại
                  </button>
                  <button 
                    onClick={() => setApiError(null)}
                    className="p-1 hover:bg-amber-200 rounded-full transition-colors text-amber-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header */}
        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between shrink-0 pt-safe transition-all duration-300">
          <div className="flex items-center gap-2 lg:gap-4 truncate">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg lg:text-xl font-semibold text-slate-800 truncate">
              {activeTab === "dashboard" ? "Tổng quan" : 
               activeTab === "rooms" ? "Sơ đồ phòng" :
               activeTab === "timeline" ? "Tình trạng đặt phòng" :
               activeTab === "bookings" ? "Danh sách đặt" :
               activeTab === "guests" ? "Khách hàng" :
               activeTab === "wallets" ? "Tài chính" :
               "Quản lý"}
            </h1>
            {activeTab === "rooms" && (
              <div className="hidden lg:flex items-center gap-2">
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="flex items-center gap-2 bg-slate-100/50 border border-slate-200 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                  <Calendar size={12} className="text-slate-500" />
                  <input
                    type="date"
                    value={viewDate}
                    onChange={(e) => setViewDate(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 outline-none w-[100px]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {activeTab === "rooms" && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200 shadow-sm">
                <button
                  onClick={() => setViewDate(format(new Date(), "yyyy-MM-dd"))}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all",
                    viewDate === format(new Date(), "yyyy-MM-dd")
                      ? "bg-white text-indigo-600 shadow border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
                  )}
                >
                  Hôm nay
                </button>
                <button
                  onClick={() => setViewDate(format(addDays(new Date(), 1), "yyyy-MM-dd"))}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all",
                    viewDate === format(addDays(new Date(), 1), "yyyy-MM-dd")
                      ? "bg-white text-indigo-600 shadow border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
                  )}
                >
                  Ngày mai
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-all relative"
                >
                  <Bell size={20} />
                  {(overdueBookings.length > 0 ||
                    (currentUser?.role === "admin" &&
                      cleaningNotifications.length > 0)) && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {overdueBookings.length +
                        (currentUser?.role === "admin"
                          ? cleaningNotifications.length
                          : 0)}
                    </span>
                  )}
                </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                          Thông báo
                        </h3>
                        <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ring-1 ring-rose-200">
                          {overdueBookings.length +
                            (currentUser?.role === "admin"
                              ? cleaningNotifications.length
                              : 0)}
                        </span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {currentUser?.role === "admin" &&
                          cleaningNotifications.length > 0 && (
                            <div className="bg-indigo-50/50 p-2 border-b border-indigo-100">
                              <p className="text-[10px] font-black text-indigo-600 uppercase px-2 py-1">
                                Dọn phòng có ghi chú
                              </p>
                              {cleaningNotifications.map((n) => (
                                <div
                                  key={n.id}
                                  className="p-3 bg-white mb-1 rounded-xl border border-indigo-100 shadow-sm"
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-indigo-600 text-sm">
                                      Phòng #{n.roomNumber}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkLogAsRead(n.id);
                                      }}
                                      className="text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-tighter"
                                    >
                                      Đã xem
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-600 italic">
                                    "{n.notes}"
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-1 font-medium">
                                    Bởi {n.userName} •{" "}
                                    {format(parseISO(n.timestamp), "HH:mm")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        {overdueBookings.length > 0 ? (
                          overdueBookings.map((b) => {
                            const room = rooms.find((r) => r.id === b.roomId);
                            return (
                              <button
                                key={b.id}
                                onClick={() => {
                                  const roomObj = rooms.find(
                                    (r) => r.id === b.roomId,
                                  );
                                  if (roomObj) handleOpenBooking(roomObj);
                                  setShowNotifications(false);
                                }}
                                className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 transition-colors"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="font-bold text-indigo-600">
                                    Phòng #{room?.number}
                                  </div>
                                  <div className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">
                                    Quá hạn trả
                                  </div>
                                </div>
                                <div className="mt-1 text-xs font-semibold text-slate-700">
                                  {b.guest.name}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Hạn trả:{" "}
                                  {format(parseISO(b.checkOut), "dd/MM/yyyy")}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-slate-400">
                            <Bell
                              className="mx-auto mb-3 opacity-20"
                              size={32}
                            />
                            <p className="text-xs font-medium">
                              Không có phòng nào quá hạn
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                        <button
                          onClick={() => {
                            setActiveTab("bookings");
                            setShowNotifications(false);
                          }}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest"
                        >
                          Xem tất cả đặt phòng
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-48 text-sm transition-all"
              />
            </div>
          </div>
        </div>
      </header>

        {/* Legend Bar */}
        {activeTab === "rooms" && (
          <div className="px-8 py-3 flex gap-6 border-b border-slate-200 bg-white/50 overflow-x-auto whitespace-nowrap">
            <LegendItem
              label="Sẵn sàng"
              value={stats.available}
              color="bg-emerald-400"
            />
            <LegendItem
              label="Đang ở"
              value={stats.occupied}
              color="bg-rose-400"
            />
            <LegendItem
              label="Đã đặt"
              value={stats.booked}
              color="bg-amber-400"
            />
            <LegendItem
              label="Dọn dẹp"
              value={stats.cleaning}
              color="bg-slate-300"
            />
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50 pb-24 lg:pb-8">
          {activeTab === "dashboard" && (
            <div className="max-w-[1200px] mx-auto space-y-8 pb-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Doanh thu tháng này
                        </p>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tighter">
                          {currentUser?.role === "admin"
                            ? `${dashboardData.monthlyIncome.toLocaleString()}đ`
                            : "********"}
                        </h4>
                      </div>
                    </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 w-[65%]"
                          style={{
                            display:
                              currentUser?.role === "admin"
                                ? "block"
                                : "none",
                          }}
                        ></div>
                      </div>
                      <p className="mt-2 text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                        {currentUser?.role === "admin"
                          ? "+12% so với tháng trước"
                          : "Bảo mật"}
                      </p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                        <DollarSign size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Chi phí tháng này
                        </p>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tighter">
                          {currentUser?.role === "admin"
                            ? `${dashboardData.monthlyExpense.toLocaleString()}đ`
                            : "********"}
                        </h4>
                      </div>
                    </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 w-[25%]"
                          style={{
                            display:
                              currentUser?.role === "admin"
                                ? "block"
                                : "none",
                          }}
                        ></div>
                      </div>
                      <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-tighter">
                        {currentUser?.role === "admin"
                          ? "-5% chi phát sinh"
                          : "Bảo mật"}
                      </p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Lợi nhuận dự kiến
                        </p>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tighter">
                          {currentUser?.role === "admin"
                            ? (
                                dashboardData.monthlyIncome -
                                dashboardData.monthlyExpense
                              ).toLocaleString() + "đ"
                            : "********"}
                        </h4>
                      </div>
                    </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 w-[80%]"
                          style={{
                            display:
                              currentUser?.role === "admin"
                                ? "block"
                                : "none",
                          }}
                        ></div>
                      </div>
                      <p className="mt-2 text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">
                        {currentUser?.role === "admin"
                          ? "Đạt 80% chỉ tiêu"
                          : "Bảo mật"}
                      </p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">
                      Doanh thu 7 ngày qua
                    </h3>
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg tracking-widest">
                      TRỰC QUAN
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.dailyData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fontSize: 10,
                            fontWeight: 700,
                            fill: "#64748b",
                          }}
                        />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "16px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                            padding: "12px",
                          }}
                          labelStyle={{
                            fontSize: "10px",
                            fontWeight: 900,
                            marginBottom: "4px",
                            textTransform: "uppercase",
                          }}
                          itemStyle={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#4f46e5",
                          }}
                        />
                        <Bar
                          dataKey="income"
                          fill="#6366f1"
                          radius={[8, 8, 0, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">
                      Cơ cấu loại phòng
                    </h3>
                    <PieChartIcon size={20} className="text-slate-400" />
                  </div>
                  <div className="h-[300px] flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardData.roomTypeStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {dashboardData.roomTypeStats.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                ["#6366f1", "#f43f5e", "#f59e0b", "#10b981"][
                                  index % 4
                                ]
                              }
                              strokeWidth={0}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "16px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-1/3 space-y-3">
                      {dashboardData.roomTypeStats.map((stat, i) => (
                        <div
                          key={stat.name}
                          className="flex items-center gap-2"
                        >
                          <div
                            className={cn(
                              "w-3 h-3 rounded-full",
                              [
                                "bg-indigo-500",
                                "bg-rose-500",
                                "bg-amber-500",
                                "bg-emerald-500",
                              ][i],
                            )}
                          ></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase">
                            {stat.name} ({stat.value})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">
                    Hoạt động gần đây
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {activityLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center",
                            log.type === "cleaning"
                              ? "bg-emerald-50 text-emerald-500"
                              : "bg-indigo-50 text-indigo-500",
                          )}
                        >
                          {log.type === "cleaning" ? (
                            <Zap size={20} />
                          ) : (
                            <ClipboardList size={20} />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {log.action}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                            Phòng #{log.roomNumber} • Bởi {log.userName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-800">
                          {format(parseISO(log.timestamp), "HH:mm")}
                        </p>
                        <p className="text-[8px] text-slate-400 uppercase font-bold">
                          {format(parseISO(log.timestamp), "dd LL, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "rooms" && (
            <div className="max-w-[1600px] mx-auto space-y-12">
              {/* Room Grid by Branch */}
              {branches
                .filter(
                  (b) =>
                    selectedBranchId === "all" || b.id === selectedBranchId,
                )
                .map((branch) => {
                  const branchRooms = roomsWithStatus.filter(
                    (r) => r.branchId === branch.id,
                  );
                  if (branchRooms.length === 0) return null;

                  return (
                    <div key={branch.id} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-3">
                          <Building2 size={20} className="text-indigo-600" />
                          <h2 className="text-xl font-black text-slate-800 tracking-tight">
                            {branch.name}
                          </h2>
                        </div>
                        <span className="text-sm font-medium text-slate-500">
                          {branch.address}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {branchRooms.map((room) => (
                          <RoomCard
                            key={room.id}
                            room={{ ...room, status: room.displayStatus }}
                            onClick={() => handleOpenBooking(room)}
                            booking={room.activeBooking}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="max-w-[1600px] mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setTimelineStartDate(addDays(timelineStartDate, -30))
                    }
                    className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft size={20} className="text-slate-600" />
                  </button>
                  <button
                    onClick={() => setTimelineStartDate(startOfDay(new Date()))}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Hôm nay
                  </button>
                  <button
                    onClick={() =>
                      setTimelineStartDate(addDays(timelineStartDate, 30))
                    }
                    className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight size={20} className="text-slate-600" />
                  </button>
                </div>
                <div className="text-sm font-bold text-slate-700">
                  Tháng {format(timelineStartDate, "MM/yyyy")}
                </div>
              </div>

              <div className="overflow-x-auto" ref={timelineScrollRef}>
                <div className="inline-block min-w-full align-middle min-h-[500px]">
                  <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200 table-fixed">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest w-32 min-w-[128px] border-r border-slate-200 sticky left-0 z-30 bg-slate-50">
                          Loại / Phòng
                        </th>
                        {Array.from({ length: 30 }).map((_, i) => {
                          const date = addDays(timelineStartDate, i);
                          const isToday =
                            date.getTime() ===
                            startOfDay(new Date()).getTime();
                          return (
                            <th
                              key={i}
                              className={`py-3 text-center text-xs font-black uppercase tracking-widest border-r border-slate-200 w-[120px] min-w-[120px] ${isToday ? "text-indigo-600 bg-indigo-50" : "text-slate-500"}`}
                            >
                              <div className="flex flex-col gap-1 items-center justify-center">
                                <span>{format(date, "EEEE").replace("Monday", "Thứ 2").replace("Tuesday", "Thứ 3").replace("Wednesday", "Thứ 4").replace("Thursday", "Thứ 5").replace("Friday", "Thứ 6").replace("Saturday", "Thứ 7").replace("Sunday", "Chủ nhật")}</span>
                                <span>{format(date, "dd/MM")}</span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {(() => {
                        const roomsByType = rooms.reduce(
                          (acc, r) => {
                            if (
                              selectedBranchId !== "all" &&
                              r.branchId !== selectedBranchId
                            )
                              return acc;
                            if (!acc[r.type]) acc[r.type] = [];
                            acc[r.type].push(r);
                            return acc;
                          },
                          {} as Record<string, typeof rooms>,
                        );

                        return Object.keys(roomsByType).map((type) => (
                          <React.Fragment key={type}>
                            <tr className="bg-slate-50 border-y border-slate-200">
                              <td
                                className="px-4 py-3 font-black text-xs text-slate-700 uppercase tracking-widest border-r border-slate-200 sticky left-0 z-20 bg-slate-50"
                              >
                                {type}
                              </td>
                              <td colSpan={30} className="bg-slate-50 border-slate-200"></td>
                            </tr>
                            {roomsByType[type].map((room) => {
                              return (
                                <tr
                                  key={room.id}
                                  className="hover:bg-slate-50/50"
                                >
                                  <td className="px-4 py-3 border-r border-slate-200 sticky left-0 z-20 bg-white group-hover:bg-slate-50/50 transition-colors">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-black text-slate-700">
                                        {room.number}
                                      </span>
                                    </div>
                                  </td>
                                  {Array.from({ length: 30 }).map((_, i) => {
                                    const currentDay = addDays(
                                      timelineStartDate,
                                      i,
                                    );
                                    const roomBookings = bookings.filter(
                                      (b) =>
                                        b.roomId === room.id &&
                                        (b.status === "confirmed" ||
                                          b.status === "checked-in"),
                                    );
                                    const bookingsForDay = roomBookings.filter(
                                      (b) => {
                                        const checkIn = startOfDay(
                                          parseISO(b.checkIn),
                                        );
                                        const checkOut = startOfDay(
                                          parseISO(b.checkOut),
                                        );
                                        return (
                                          currentDay.getTime() >= checkIn.getTime() &&
                                          currentDay.getTime() <= checkOut.getTime()
                                        );
                                      },
                                    );

                                    return (
                                      <td
                                        key={i}
                                        onClick={(e) => {
                                           const fullRoom = rooms.find(r => r.id === room.id) || room;
                                           setSelectedRoom(fullRoom);
                                           setSelectedBooking(null);
                                           setGuestName("");
                                           setGuestPhone("");
                                           setGuestIdCard("");
                                           setCheckInDate(format(currentDay, "yyyy-MM-dd"));
                                           setCheckOutDate(format(addDays(currentDay, 1), "yyyy-MM-dd"));
                                           setSelectedServices([]);
                                           setDeposit(0);
                                           setIsBookingModalOpen(true);
                                        }}
                                        className="p-0 border-r border-slate-200 h-14 relative cursor-pointer hover:bg-slate-50"
                                      >
                                        {bookingsForDay.map((bookingForDay) => {
                                          let barStyles = "w-full left-0 right-0";
                                          let roundedClass = "";
                                          let colorClass = "bg-emerald-500 hover:bg-emerald-600";
                                          
                                          const checkIn = startOfDay(
                                            parseISO(bookingForDay.checkIn),
                                          ).getTime();
                                          const checkOut = startOfDay(
                                            parseISO(bookingForDay.checkOut),
                                          ).getTime();
                                          const current = currentDay.getTime();
                                          
                                          // Same day booking (unlikely in overnight, but possible)
                                          if (checkIn === checkOut && current === checkIn) {
                                            barStyles = "left-[10%] w-[80%] z-20";
                                            roundedClass = "rounded-md";
                                          } 
                                          else if (current === checkIn) {
                                            barStyles = "left-[50%] w-[calc(50%+2px)] z-20";
                                            roundedClass = "rounded-l-md pointer-events-auto";
                                          }
                                          else if (current === checkOut) {
                                            barStyles = "-left-[1px] w-[calc(50%+1px)] z-20";
                                            roundedClass = "rounded-r-md pointer-events-auto";
                                          }
                                          else {
                                            // Middle day
                                            barStyles = "-left-[1px] w-[calc(100%+2px)] z-20";
                                            roundedClass = "rounded-none pointer-events-auto";
                                          }
                                          
                                          // If it's the first visible cell and booking started before, we want flat left side
                                          if (i === 0 && current > checkIn) {
                                              roundedClass = roundedClass.replace("rounded-l-md", "rounded-none");
                                              if (current < checkOut) {
                                                  barStyles = "-left-[1px] w-[calc(100%+2px)] z-20";
                                              } else if (current === checkOut) {
                                                  barStyles = "-left-[1px] w-[calc(50%+1px)] z-20";
                                              }
                                          }
                                          // If it's the last visible cell and booking ends after, we want flat right side
                                          if (i === 29 && current < checkOut) {
                                              roundedClass = roundedClass.replace("rounded-r-md", "rounded-none");
                                          }

                                          if (bookingForDay.status === 'checked-in') {
                                            colorClass = "bg-blue-500 hover:bg-blue-600";
                                          }

                                          return (
                                            <div
                                              key={bookingForDay.id}
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  // Find the full room from rooms list to ensure we have all data
                                                  const fullRoom = rooms.find(r => r.id === room.id) || room;
                                                  setSelectedRoom(fullRoom);
                                                  setSelectedBooking(bookingForDay);
                                                  setGuestName(bookingForDay.guest.name);
                                                  setGuestPhone(bookingForDay.guest.phone);
                                                  setGuestIdCard(bookingForDay.guest.idCard || "");
                                                  setCheckInDate(format(parseISO(bookingForDay.checkIn), "yyyy-MM-dd"));
                                                  setCheckOutDate(format(parseISO(bookingForDay.checkOut), "yyyy-MM-dd"));
                                                  setSelectedServices(bookingForDay.services || []);
                                                  setDeposit(bookingForDay.deposit || 0);
                                                  setIsBookingModalOpen(true);
                                              }}
                                              title={`Khách: ${bookingForDay.guest.name}\nSĐT: ${bookingForDay.guest.phone}\nTừ: ${format(parseISO(bookingForDay.checkIn), "dd/MM/yyyy")}\nĐến: ${format(parseISO(bookingForDay.checkOut), "dd/MM/yyyy")}`}
                                              className={`absolute top-[50%] -translate-y-1/2 h-10 ${colorClass} cursor-pointer flex items-center px-2 shadow-sm ${roundedClass} ${barStyles} transition-colors`}
                                            >
                                              {(current === checkIn || i === 0) && (
                                                <span className="text-[10px] text-white font-bold truncate">
                                                  {bookingForDay.guest.name}
                                                </span>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "bookings" && (
            <div className="max-w-[1200px] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Phòng
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Khách hàng
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                      Giá tạm tính
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings
                    .filter(
                      (b) =>
                        selectedBranchId === "all" ||
                        b.branchId === selectedBranchId,
                    )
                    .reverse()
                    .map((b) => {
                      const room = rooms.find((r) => r.id === b.roomId);
                      const branch = branches.find(
                        (br) => br.id === b.branchId,
                      );
                      return (
                        <tr
                          key={b.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="font-bold text-indigo-600">
                              P.{room?.number}
                            </span>
                            {selectedBranchId === "all" && branch && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {branch.name}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">
                                {b.guest.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {b.guest.phone}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {format(parseISO(b.checkIn), "dd/MM/yyyy")} -{" "}
                            {format(parseISO(b.checkOut), "dd/MM/yyyy")}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                                b.status === "checked-in"
                                  ? "bg-blue-100 text-blue-700"
                                  : b.status === "confirmed"
                                    ? "bg-amber-100 text-amber-700"
                                    : b.status === "checked-out"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-gray-100 text-gray-700",
                              )}
                            >
                              {b.status === "checked-in"
                                ? "Đang ở"
                                : b.status === "confirmed"
                                  ? "Đã đặt"
                                  : b.status === "checked-out"
                                    ? "Đã trả"
                                    : "Đã hủy"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-right font-medium">
                            {b.totalPrice.toLocaleString()}đ
                          </td>
                        </tr>
                      );
                    })}
                  {bookings.filter(
                    (b) =>
                      selectedBranchId === "all" ||
                      b.branchId === selectedBranchId,
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-400 font-medium"
                      >
                        Chưa có giao dịch nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "guests" && (
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from(
                new Set(
                  bookings
                    .filter(
                      (b) =>
                        selectedBranchId === "all" ||
                        b.branchId === selectedBranchId,
                    )
                    .map((b) => b.guest.idCard),
                ),
              ).map((idCard) => {
                const guestBookings = bookings.filter(
                  (b) => b.guest.idCard === idCard,
                );
                const latestGuest =
                  guestBookings[guestBookings.length - 1].guest;
                return (
                  <div
                    key={idCard}
                    className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                        <Users size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">
                          {latestGuest.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          CCCD: {latestGuest.idCard}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400">
                          Số điện thoại
                        </span>
                        <span className="text-sm font-medium">
                          {latestGuest.phone}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-gray-400">
                          Lần cuối ở
                        </span>
                        <span className="text-sm font-medium">
                          {guestBookings.length} lần
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "logs" && (
            <div className="max-w-[1200px] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">
                    Nhật ký hoạt động hệ thống
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={selectedRoomIdForLog}
                      onChange={(e) => setSelectedRoomIdForLog(e.target.value)}
                      className="text-[10px] font-bold uppercase tracking-tight bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">Tất cả phòng</option>
                      {rooms
                        .sort((a, b) => a.number.localeCompare(b.number))
                        .map((room) => (
                          <option key={room.id} value={room.id}>
                            Phòng {room.number}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 text-[10px] items-center text-slate-400 font-bold uppercase tracking-tight">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
                  Dọn phòng
                  <div className="w-2 h-2 rounded-full bg-indigo-500 ml-2"></div>{" "}
                  Đặt/Nhận/Trả
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Thời gian
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Phòng
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Nhân viên
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Thao tác
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Ghi chú
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map((log: any) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-gray-400 font-medium"
                        >
                          Chưa có nhật ký nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "room_manager" && (
            <div className="max-w-[1200px] mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  Quản lý phòng nghỉ
                </h2>
                <button
                  onClick={() => {
                    setEditingRoom(null);
                    setIsRoomModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all font-sans shrink-0"
                >
                  <Plus size={16} />
                  <span>Thêm phòng</span>
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Số phòng / CN
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Loại phòng / Giá
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Trạng thái hiện tại
                      </th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rooms
                      .filter(
                        (r) =>
                          selectedBranchId === "all" ||
                          r.branchId === selectedBranchId,
                      )
                      .map((room) => {
                        const branch = branches.find(
                          (b) => b.id === room.branchId,
                        );
                        return (
                          <tr
                            key={room.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <span className="font-black text-indigo-600 text-lg">
                                #{room.number}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {branch?.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-700">
                                {room.type}
                              </div>
                              <div className="text-xs text-slate-500 font-semibold">
                                {room.price.toLocaleString()}đ / đêm
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                  room.status === "available" &&
                                    "bg-emerald-100 text-emerald-700",
                                  room.status === "occupied" &&
                                    "bg-rose-100 text-rose-700",
                                  room.status === "booked" &&
                                    "bg-amber-100 text-amber-700",
                                  room.status === "cleaning" &&
                                    "bg-slate-200 text-slate-700",
                                  room.status === "maintenance" &&
                                    "bg-orange-100 text-orange-700",
                                )}
                              >
                                {room.status === "available"
                                  ? "Sẵn sàng"
                                  : room.status === "occupied"
                                    ? "Đang ở"
                                    : room.status === "booked"
                                      ? "Đã đặt"
                                      : room.status === "cleaning"
                                        ? "Dọn dẹp"
                                        : "Bảo trì"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setEditingRoom(room);
                                  setIsRoomModalOpen(true);
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Xác nhận xóa phòng này?")) {
                                    hotelService.deleteRoom(room.id);
                                    setRooms(hotelService.getRooms());
                                  }
                                }}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "branches" && (
            <div className="max-w-[1200px] mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Hệ thống chi nhánh
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Quản lý thông tin các cơ sở lưu trú trong hệ thống
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingBranch(null);
                    setIsBranchModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all font-sans shrink-0"
                >
                  <Plus size={16} />
                  <span>Thêm chi nhánh</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 group hover:border-indigo-200 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <Hotel size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">
                            {branch.name}
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">
                            {rooms.filter((r) => r.branchId === branch.id)
                              .length}{" "}
                            Phòng nghỉ
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingBranch(branch);
                            setIsBranchModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Xác nhận xóa chi nhánh "${branch.name}"? Tất cả phòng thuộc chi nhánh này cũng sẽ bị xóa.`,
                              )
                            ) {
                              hotelService.deleteBranch(branch.id);
                              setBranches(hotelService.getBranches());
                              setRooms(hotelService.getRooms());
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin
                          size={16}
                          className="text-slate-400 mt-0.5 shrink-0"
                        />
                        <span>{branch.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={16} className="text-slate-400 shrink-0" />
                        <span>{branch.phone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "wallets" && (
            <div className="max-w-[1200px] mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Sổ quỹ & Ví
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Quản lý dòng tiền, số dư các tài khoản
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTransactionType("income");
                    const firstWallet = wallets[0];
                    if (firstWallet) setTransactionWalletId(firstWallet.id);
                    setIsTransactionModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all font-sans shrink-0"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Thêm giao dịch</span>
                  <span className="sm:hidden">Thêm</span>
                </button>
              </div>

              {/* Wallets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center"
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                        wallet.type === "cash"
                          ? "bg-emerald-100 text-emerald-600"
                          : wallet.type === "bank"
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-purple-100 text-purple-600",
                      )}
                    >
                      <WalletIcon size={24} />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {wallet.name}
                    </span>
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">
                      {currentUser?.username === "admin"
                        ? `${wallet.balance.toLocaleString()}đ`
                        : "********"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">
                    Lịch sử giao dịch
                  </h3>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Thời gian
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Loại GD / Ví
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
                        Số tiền
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Nội dung
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((txn) => {
                      const tWallet = wallets.find(
                        (w) => w.id === txn.walletId,
                      );
                      return (
                        <tr
                          key={txn.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col text-xs">
                              <span className="font-bold text-slate-700">
                                {format(parseISO(txn.date), "HH:mm:ss")}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {format(parseISO(txn.date), "dd/MM/yyyy")}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "flex w-6 h-6 rounded-full items-center justify-center",
                                  txn.type === "income"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-rose-100 text-rose-600",
                                )}
                              >
                                {txn.type === "income" ? (
                                  <ArrowDownRight size={14} />
                                ) : (
                                  <ArrowUpRight size={14} />
                                )}
                              </span>
                              <span className="font-bold text-slate-700 text-xs">
                                {tWallet?.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={cn(
                                "font-black text-sm",
                                txn.type === "income"
                                  ? "text-emerald-600"
                                  : "text-rose-600",
                              )}
                            >
                              {currentUser?.username === "admin" ? (
                                <>
                                  {txn.type === "income" ? "+" : "-"}
                                  {txn.amount.toLocaleString()}đ
                                </>
                              ) : (
                                "********"
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600 max-w-sm truncate">
                            {txn.description}
                          </td>
                        </tr>
                      );
                    })}
                    {transactions.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-gray-400 font-medium"
                        >
                          Chưa có giao dịch nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "employees" && (
            <div className="max-w-[1200px] mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Quản lý nhân viên
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Danh sách nhân viên, vai trò và thông tin chi tiết
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingEmployee(null);
                    setIsEmployeeModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all font-sans shrink-0"
                >
                  <Plus size={16} />
                  <span>Thêm nhân viên</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Nhân viên
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Vai trò / Chi nhánh
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
                        Lương
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((employee) => {
                      const branchNames = employee.branchIds?.includes('all') ? 'Tất cả chi nhánh' : branches.filter(b => employee.branchIds?.includes(b.id)).map(b => b.name).join(', ') || 'N/A';
                      return (
                        <tr
                          key={employee.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                                {employee.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800">
                                  {employee.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {employee.username || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-indigo-600 uppercase">
                                {employee.position}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {branchNames} • {employee.role === 'admin' ? 'Quản trị' : 'Nhân viên'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-slate-700">
                              {employee.salary.toLocaleString()}đ
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ring-1",
                                employee.status === "active"
                                  ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
                                  : "bg-slate-50 text-slate-400 ring-slate-200",
                              )}
                            >
                              {employee.status === "active"
                                ? "Đang làm"
                                : "Nghỉ"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingEmployee(employee);
                                setIsEmployeeModalOpen(true);
                              }}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Xác nhận xóa nhân viên "${employee.name}"?`,
                                  )
                                ) {
                                  hotelService.deleteEmployee(employee.id);
                                  setEmployees(hotelService.getEmployees());
                                }
                              }}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 pb-safe z-50 px-2">
        <BottomNavItem
          icon={<LayoutDashboard size={20} />}
          label="Tổng quan"
          active={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
        />
        <BottomNavItem
          icon={<DoorOpen size={20} />}
          label="Phòng"
          active={activeTab === "rooms"}
          onClick={() => setActiveTab("rooms")}
        />
        <BottomNavItem
          icon={<ClipboardList size={20} />}
          label="Đặt phòng"
          active={activeTab === "bookings"}
          onClick={() => setActiveTab("bookings")}
        />
        <BottomNavItem
          icon={<WalletIcon size={20} />}
          label="Tài chính"
          active={activeTab === "wallets"}
          onClick={() => setActiveTab("wallets")}
        />
      </nav>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isTransactionModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransactionModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">
                  Thêm giao dịch mới
                </h3>
                <button
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setTransactionType("income")}
                    className={cn(
                      "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                      transactionType === "income"
                        ? "bg-white text-emerald-600 shadow-sm"
                        : "text-slate-400",
                    )}
                  >
                    Thu nhập
                  </button>
                  <button
                    onClick={() => setTransactionType("expense")}
                    className={cn(
                      "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                      transactionType === "expense"
                        ? "bg-white text-rose-600 shadow-sm"
                        : "text-slate-400",
                    )}
                  >
                    Chi phí
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Số tiền (VNĐ)
                    </label>
                    <input
                      type="text"
                      value={
                        transactionAmount
                          ? transactionAmount.toLocaleString("vi-VN")
                          : ""
                      }
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setTransactionAmount(Number(val));
                      }}
                      placeholder="Nhập số tiền..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Chọn ví / tài khoản
                    </label>
                    <select
                      value={transactionWalletId}
                      onChange={(e) => setTransactionWalletId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                          {currentUser?.username === "admin"
                            ? ` (Số dư: ${w.balance.toLocaleString()}đ)`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Nội dung giao dịch
                    </label>
                    <textarea
                      value={transactionDescription}
                      onChange={(e) =>
                        setTransactionDescription(e.target.value)
                      }
                      placeholder="Ghi chú chi tiết..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none font-sans"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveTransaction}
                  className={cn(
                    "w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all font-sans",
                    transactionType === "income"
                      ? "bg-emerald-600 text-white shadow-emerald-200"
                      : "bg-rose-600 text-white shadow-rose-200",
                  )}
                >
                  Xác nhận giao dịch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Drawer - Now a centered wide Modal */}
      <AnimatePresence>
        {isBookingModalOpen && selectedRoom && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                  <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                    {selectedBooking?.status === "confirmed"
                      ? "Xác thực & Nhận phòng"
                      : "Thông tin phòng & nhận khách"}
                    {selectedBooking?.isExtended && (
                      <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded border border-amber-200">
                        GIA HẠN
                      </span>
                    )}
                  </h3>
                  <div className="mt-1 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-indigo-600 tracking-tight">
                        #{selectedRoom.number}
                      </span>
                      <span className="text-sm font-semibold text-slate-500">
                        {selectedRoom.type}
                      </span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200"></div>
                    <p className="text-sm font-bold text-slate-400">
                      {`${selectedRoom.price.toLocaleString()}đ / đêm`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBookingModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Column: Guest & Booking Details */}
                  <div className="space-y-8">
                    {selectedBooking?.isExtended &&
                      selectedBooking?.originalCheckOut && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                          <div className="mt-0.5 text-amber-600">
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">
                              Lịch sử gia hạn
                            </p>
                            <p className="text-[10px] text-amber-700 mt-0.5">
                              Ngày trả phòng ban đầu:{" "}
                              <span className="font-bold">
                                {format(
                                  parseISO(selectedBooking.originalCheckOut),
                                  "dd/MM/yyyy",
                                )}
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    {selectedBooking?.status === "confirmed" && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <div className="mt-0.5 text-amber-600">
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">
                            Đối chiếu thông tin
                          </p>
                          <p className="text-[10px] text-amber-700 mt-0.5">
                            Khách đã đặt trước. Vui lòng đối chiếu CCCD và số
                            điện thoại trước khi bàn giao phòng.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                        Thông tin khách hàng
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Họ và tên khách
                          </label>
                          <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Nhập tên khách..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Số điện thoại
                          </label>
                          <input
                            type="tel"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="09xx xxx xxx"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Số CCCD / Passport
                          </label>
                          <input
                            type="text"
                            value={guestIdCard}
                            onChange={(e) => setGuestIdCard(e.target.value)}
                            placeholder="Nhập CCCD để lưu lịch sử..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                          />
                        </div>
                        {(!selectedBooking ||
                          selectedBooking.status === "confirmed") && (
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Khách đặt cọc
                            </label>
                            <input
                              type="text"
                              value={
                                deposit
                                  ? deposit.toLocaleString("vi-VN")
                                  : ""
                              }
                              readOnly={
                                !(
                                  currentUser?.role === "admin" ||
                                  currentUser?.position === "Quản lý" ||
                                  currentUser?.position === "Lễ tân"
                                )
                              }
                              onChange={(e) => {
                                const val = e.target.value.replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                setDeposit(Number(val));
                              }}
                              placeholder="Tiền cọc..."
                              className="w-full bg-slate-50 border border-emerald-200 rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-600"
                            />
                          </div>
                        )}
                      </div>

                      {(!selectedBooking ||
                        selectedBooking.status === "checked-in" ||
                        selectedBooking.status === "confirmed") && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Xác nhận thanh toán vào ví/ngân hàng
                          </label>
                          <select
                            value={paymentWalletId}
                            onChange={(e) => setPaymentWalletId(e.target.value)}
                            className="w-full bg-indigo-50/50 border border-indigo-100 rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold text-indigo-700 appearance-none"
                          >
                            <option value="">-- Chọn ví nhận --</option>
                            {wallets.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                                {currentUser?.username === "admin"
                                  ? ` (Tồn: ${w.balance.toLocaleString()}đ)`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                        Thời gian đặt phòng
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Ngày nhận
                          </label>
                          <input
                            type="date"
                            value={checkInDate}
                            onChange={(e) => setCheckInDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-4 py-3 outline-none font-medium text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Ngày trả
                          </label>
                          <input
                            type="date"
                            value={checkOutDate}
                            onChange={(e) => setCheckOutDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-4 py-3 outline-none font-medium text-slate-700"
                          />
                        </div>
                      </div>
                    </div>

                    {(selectedBooking?.status === "checked-in" ||
                      selectedRoom.status === "occupied") && (
                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                            Gia hạn lưu trú nhanh
                          </span>
                          <Calendar size={14} className="text-indigo-400" />
                        </div>
                        <div className="flex gap-3">
                          <input
                            type="date"
                            value={checkOutDate}
                            min={format(
                              addDays(parseISO(checkInDate), 1),
                              "yyyy-MM-dd",
                            )}
                            onChange={(e) => setCheckOutDate(e.target.value)}
                            className="flex-1 bg-white border border-indigo-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-600"
                          />
                          <button
                            onClick={() => {
                              if (selectedBooking) {
                                const oldCheckOut = selectedBooking.checkOut;
                                const newCheckOut = new Date(
                                  checkOutDate,
                                ).toISOString();

                                const updatedBooking: Booking = {
                                  ...selectedBooking,
                                  checkOut: newCheckOut,
                                  isExtended: true,
                                  originalCheckOut:
                                    selectedBooking.originalCheckOut ||
                                    oldCheckOut,
                                  totalPrice:
                                    selectedRoom.price *
                                      Math.max(
                                        1,
                                        differenceInDays(
                                          parseISO(newCheckOut),
                                          parseISO(selectedBooking.checkIn),
                                        ),
                                      ) +
                                    (selectedBooking.services?.reduce(
                                      (acc, s) => acc + s.price,
                                      0,
                                    ) || 0),
                                };

                                hotelService.saveBooking(updatedBooking);

                                if (currentUser) {
                                  hotelService.addLog({
                                    id: Math.random().toString(36).substr(2, 9),
                                    type: "booking",
                                    roomId: selectedRoom.id,
                                    roomNumber: selectedRoom.number,
                                    userId: currentUser.username,
                                    userName: currentUser.fullName,
                                    timestamp: new Date().toISOString(),
                                    action: "Gia hạn lưu trú",
                                    notes: `Gia hạn từ ${format(parseISO(oldCheckOut), "dd/MM")} đến ${format(parseISO(newCheckOut), "dd/MM")}`,
                                    details: `Ngày cũ: ${oldCheckOut}, Ngày mới: ${newCheckOut}`,
                                  });
                                }

                                setRooms(hotelService.getRooms());
                                setBookings(hotelService.getBookings());
                                setActivityLogs(hotelService.getLogs());
                                setIsBookingModalOpen(false);
                                alert("Đã gia hạn ngày lưu trú thành công!");
                              }
                            }}
                            className="px-6 bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all"
                          >
                            Gia hạn ngay
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Services & History */}
                  <div className="space-y-8">
                    {(selectedBooking?.status === "checked-in" ||
                      selectedRoom.status === "occupied") && (
                      <div className="space-y-5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                          Dịch vụ đi kèm
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {ADDITIONAL_SERVICES.map((service) => {
                            const isSelected = selectedServices.some(
                              (s) => s.id === service.id,
                            );
                            return (
                              <button
                                key={service.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedServices(
                                      selectedServices.filter(
                                        (s) => s.id !== service.id,
                                      ),
                                    );
                                  } else {
                                    setSelectedServices([
                                      ...selectedServices,
                                      service,
                                    ]);
                                  }
                                }}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                                  isSelected
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-indigo-100",
                                )}
                              >
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold truncate">
                                    {service.name}
                                  </span>
                                  <span className="text-[9px] opacity-70 italic">
                                    {service.price.toLocaleString()}đ
                                  </span>
                                </div>
                                {isSelected && (
                                  <Check
                                    size={14}
                                    className="text-indigo-600"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
                        Hạch toán đặt phòng
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium tracking-tight">
                            Tiền phòng (x
                            {Math.max(
                              1,
                              differenceInDays(
                                parseISO(checkOutDate),
                                parseISO(checkInDate),
                              ),
                            )}{" "}
                            đêm):
                          </span>
                          <span className="font-bold text-slate-800">
                            {(
                              selectedRoom.price *
                              Math.max(
                                1,
                                differenceInDays(
                                  parseISO(checkOutDate),
                                  parseISO(checkInDate),
                                ),
                              )
                            ).toLocaleString() + "đ"}
                          </span>
                        </div>
                        {selectedServices.length > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium tracking-tight">
                              Dịch vụ ({selectedServices.length}):
                            </span>
                            <span className="font-bold text-slate-800">
                              {selectedServices
                                .reduce((acc, s) => acc + s.price, 0)
                                .toLocaleString()}
                              đ
                            </span>
                          </div>
                        )}
                        <div className="pt-3 flex flex-col gap-2">
                          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                            <div className="space-y-1">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                Tiền đặt cọc
                              </label>
                            <span className="text-sm font-bold text-emerald-600">
                              {`${deposit.toLocaleString()}đ`}
                            </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                Cần thanh toán
                              </label>
                              <span className="text-xl font-black text-indigo-600">
                                {(
                                  selectedRoom.price *
                                    Math.max(
                                      1,
                                      differenceInDays(
                                        parseISO(checkOutDate),
                                        parseISO(checkInDate),
                                      ),
                                    ) +
                                  selectedServices.reduce(
                                    (acc, s) => acc + s.price,
                                    0,
                                  ) -
                                  deposit
                                ).toLocaleString() + "đ"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* History Inside Right Column */}
                    <div className="pt-4 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                        <History size={14} />
                        Lịch sử hoạt động phòng
                      </h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {filteredLogs
                        .filter((log) => log.roomId === selectedRoom.id)
                        .slice(0, 10)
                        .map((log) => (
                          <div
                            key={log.id}
                            className="relative pl-4 border-l-2 border-slate-100 py-1"
                          >
                              <div
                                className={cn(
                                  "absolute -left-[5px] top-2 w-2 h-2 rounded-full",
                                  log.type === "cleaning"
                                    ? "bg-emerald-400"
                                    : "bg-indigo-400",
                                )}
                              ></div>
                              <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">
                                  {log.action}
                                </span>
                                <span className="text-[8px] text-slate-400 font-medium">
                                  {format(
                                    parseISO(log.timestamp),
                                    "HH:mm - dd/MM",
                                  )}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-500 mt-0.5 italic leading-tight">
                                {log.notes}
                              </p>
                              <p className="text-[8px] text-slate-400 mt-0.5 font-medium">
                                Bởi: {log.userName}
                              </p>
                            </div>
                          ))}
                        {activityLogs.filter(
                          (log) => log.roomId === selectedRoom.id,
                        ).length === 0 && (
                          <p className="text-[10px] text-slate-400 italic text-center py-4">
                            Chưa có lịch sử hoạt động
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-8 py-6 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  <CheckCircle size={14} className="text-emerald-500" />
                  Đảm bảo kiểm tra CCCD trước khi giao phòng
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsBookingModalOpen(false)}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-100 transition-all text-xs tracking-widest uppercase"
                  >
                    Đóng
                  </button>

                  <div className="flex gap-2">
                    {(currentUser.role === "admin" ||
                      currentUser.position === "Quản lý" ||
                      currentUser.position === "Lễ tân") && (
                      <>
                        {selectedBooking?.status === "confirmed" ? (
                          <>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    "Bạn có chắc chắn muốn hủy đặt phòng này?",
                                  )
                                ) {
                                  handleSaveBooking("cancelled");
                                }
                              }}
                              className="px-6 py-3 bg-white text-rose-500 border border-rose-200 rounded-xl font-bold hover:bg-rose-50 transition-all uppercase text-xs tracking-widest"
                            >
                              HỦY ĐẶT
                            </button>
                            {format(new Date(), "yyyy-MM-dd") <
                            format(
                              parseISO(selectedBooking.checkIn),
                              "yyyy-MM-dd",
                            ) ? (
                              <button
                                disabled
                                className="px-8 py-3 bg-slate-200 text-slate-400 rounded-xl font-bold uppercase text-xs tracking-widest cursor-not-allowed"
                              >
                                CHƯA ĐẾN NGÀY NHẬN
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSaveBooking("checked-in")}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase text-xs tracking-widest"
                              >
                                NHẬN PHÒNG
                              </button>
                            )}
                          </>
                        ) : selectedBooking?.status === "checked-in" ? (
                          <button
                            onClick={() => handleSaveBooking("checked-out")}
                            className="px-8 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 uppercase text-xs tracking-widest"
                          >
                            XÁC NHẬN TRẢ PHÒNG
                          </button>
                        ) : !selectedBooking || selectedRoom.status === "available" ? (
                          <>
                            <button
                              disabled={!guestName || !guestPhone}
                              onClick={() => handleSaveBooking("confirmed")}
                              className="px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-50 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                            >
                              LƯU & ĐẶT TRƯỚC
                            </button>
                            <button
                              disabled={!guestName || !guestPhone}
                              onClick={() => handleSaveBooking("checked-in")}
                              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase text-xs tracking-widest disabled:opacity-50"
                            >
                              NHẬN PHÒNG NGAY
                            </button>
                          </>
                        ) : null}
                      </>
                    )}

                    {selectedRoom.status === "cleaning" && (
                      <button
                        onClick={() => setIsCleaningModalOpen(true)}
                        className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 uppercase text-xs tracking-widest"
                      >
                        XÁC NHẬN DỌN XONG
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cleaning Modal */}
      <AnimatePresence>
        {isCleaningModalOpen && selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCleaningModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 flex flex-col"
            >
              <div className="p-6 bg-emerald-500 text-white flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight tracking-tight">
                    Xác nhận dọn dẹp
                  </h3>
                  <p className="text-emerald-50 text-xs mt-1">
                    Phòng {selectedRoom.number} -{" "}
                    {selectedBranchId === "b1" ? "CN Hà Nội" : "CN Đà Nẵng"}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Ghi chú dọn phòng
                  </label>
                  <textarea
                    value={cleaningNotes}
                    onChange={(e) => setCleaningNotes(e.target.value)}
                    placeholder="Ví dụ: Đã thay drap giường, bổ sung nước suối..."
                    className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none italic"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      "Sạch sẽ",
                      "Bổ sung nước",
                      "Thiếu khăn",
                      "Cần bảo trì",
                    ].map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setCleaningNotes((prev) =>
                            prev ? `${prev}, ${tag}` : tag,
                          )
                        }
                        className="px-2 py-1 bg-slate-100 text-[9px] font-bold text-slate-500 rounded hover:bg-emerald-50 hover:text-emerald-600 transition-all uppercase"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsCleaningModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs tracking-widest uppercase"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      if (selectedRoom.status === "cleaning") {
                        handleUpdateStatus("available", cleaningNotes);
                      } else {
                        handleUpdateStatus("cleaning", cleaningNotes);
                      }
                      setIsCleaningModalOpen(false);
                    }}
                    className="flex-1 py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 text-xs tracking-widest uppercase"
                  >
                    {selectedRoom.status === "cleaning"
                      ? "Xác nhận dọn xong"
                      : "Bắt đầu dọn dẹp"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Room Modal */}
      <AnimatePresence>
        {isRoomModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoomModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
                  {editingRoom ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
                </h3>
                <button
                  onClick={() => setIsRoomModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveRoom} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Số phòng
                  </label>
                  <input
                    name="number"
                    defaultValue={editingRoom?.number}
                    required
                    autoFocus
                    placeholder="VD: 101"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Loại phòng
                    </label>
                    <select
                      name="type"
                      defaultValue={editingRoom?.type}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    >
                      {ROOM_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Chi nhánh
                    </label>
                    <select
                      name="branchId"
                      defaultValue={editingRoom?.branchId || branches[0]?.id}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Giá phòng (VNĐ/đêm)
                  </label>
                  <input
                    name="price"
                    type="number"
                    defaultValue={editingRoom?.price}
                    required
                    placeholder="VD: 500000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    Lưu thông tin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Branch Modal */}
      <AnimatePresence>
        {isBranchModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBranchModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
                  {editingBranch ? "Chỉnh sửa chi nhánh" : "Thêm chi nhánh mới"}
                </h3>
                <button
                  onClick={() => setIsBranchModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveBranch} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tên chi nhánh
                  </label>
                  <input
                    name="name"
                    defaultValue={editingBranch?.name}
                    required
                    autoFocus
                    placeholder="VD: Amigo Đà Lạt 3"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Địa chỉ
                  </label>
                  <input
                    name="address"
                    defaultValue={editingBranch?.address}
                    required
                    placeholder="VD: 123 Đường Hồ Tùng Mậu, Đà Lạt"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Số điện thoại
                  </label>
                  <input
                    name="phone"
                    defaultValue={editingBranch?.phone}
                    required
                    placeholder="VD: 0988112233"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    Lưu thông tin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Employee Modal */}
      <AnimatePresence>
        {isEmployeeModalOpen && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEmployeeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
                  {editingEmployee ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
                </h3>
                <button
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Họ và tên
                    </label>
                    <input
                      name="name"
                      defaultValue={editingEmployee?.name}
                      required
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Số điện thoại
                    </label>
                    <input
                      name="phone"
                      defaultValue={editingEmployee?.phone}
                      required
                      placeholder="VD: 090xxxxxxx"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Tên đăng nhập
                    </label>
                    <input
                      name="username"
                      type="text"
                      defaultValue={editingEmployee?.username}
                      required
                      placeholder="VD: nguyenvana"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Mật khẩu
                    </label>
                    <input
                      name="password"
                      type="text"
                      defaultValue={editingEmployee?.password}
                      required
                      placeholder="VD: 123456"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Chức vụ
                    </label>
                    <select
                      name="position"
                      defaultValue={editingEmployee?.position || 'Lễ tân'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    >
                      {EMPLOYEE_POSITIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Quyền truy cập
                    </label>
                    <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-semibold text-sm">
                      {editingEmployee?.role === "admin" ||
                      (!editingEmployee && false) // Logic simplified below in form submit
                        ? "Quản trị toàn hệ thống (Admin)"
                        : "Chỉ được phép theo chức vụ"}
                    </div>
                    {/* Hidden input to ensure role is submitted if needed, but we'll handle it in handleSaveEmployee instead */}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Lương (nghìn VNĐ)
                    </label>
                    <input
                      name="salary"
                      type="number"
                      defaultValue={editingEmployee ? editingEmployee.salary / 1000 : undefined}
                      required
                      placeholder="VD: 10000"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Ngày bắt đầu
                    </label>
                    <input
                      name="startDate"
                      type="date"
                      defaultValue={editingEmployee?.startDate || format(new Date(), 'yyyy-MM-dd')}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Chi nhánh công tác (Ctrl/Cmd để chọn nhiều)
                    </label>
                    <select
                      name="branchIds"
                      multiple
                      defaultValue={editingEmployee?.branchIds || ['all']}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold h-32"
                    >
                      <option value="all">Tất cả chi nhánh</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Trạng thái làm việc
                    </label>
                    <select
                      name="status"
                      defaultValue={editingEmployee?.status || 'active'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    >
                      <option value="active">Đang làm việc</option>
                      <option value="inactive">Đã nghỉ việc</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    Lưu nhân viên
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const NavItem = React.memo(
  ({
    icon,
    label,
    active,
    onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
  }) => {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
          active
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200/50"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
        )}
      >
        <span
          className={cn(
            "transition-colors",
            active ? "text-white" : "text-slate-500 opacity-70",
          )}
        >
          {icon}
        </span>
        {label}
      </button>
    );
  },
);

const BottomNavItem = React.memo(
  ({
    icon,
    label,
    active,
    onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
  }) => {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all",
          active ? "text-indigo-600" : "text-slate-400",
        )}
      >
        <div
          className={cn(
            "p-1.5 rounded-lg transition-all",
            active ? "bg-indigo-50" : "bg-transparent",
          )}
        >
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tighter">
          {label}
        </span>
      </button>
    );
  },
);

const LegendItem = React.memo(
  ({
    label,
    value,
    color,
  }: {
    label: string;
    value: number;
    color: string;
  }) => {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
        <span className={cn("w-2.5 h-2.5 rounded-full", color)}></span>
        {label} ({value})
      </div>
    );
  },
);

const LogRow = React.memo(({ log }: { log: any }) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex flex-col text-xs">
        <span className="font-bold text-slate-700">
          {format(parseISO(log.timestamp), "HH:mm:ss")}
        </span>
        <span className="text-[10px] text-slate-400">
          {format(parseISO(log.timestamp), "dd/MM/yyyy")}
        </span>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className="font-black text-indigo-600 text-sm">
        #{log.roomNumber}
      </span>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
          {log.userName[0]}
        </div>
        <span className="text-xs font-semibold text-slate-600">
          {log.userName}
        </span>
      </div>
    </td>
    <td className="px-6 py-4">
      <span
        className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
          log.type === "cleaning"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-indigo-100 text-indigo-700",
        )}
      >
        {log.action}
      </span>
    </td>
    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate italic">
      {log.notes || "-"}
    </td>
  </tr>
));

const TransactionItem = React.memo(({ t, wallets }: { t: any; wallets: Wallet[] }) => (
  <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-100 hover:shadow-sm transition-all group">
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
          t.type === "income"
            ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
            : "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
        )}
      >
        {t.type === "income" ? (
          <TrendingUp size={20} />
        ) : (
          <TrendingDown size={20} />
        )}
      </div>
      <div className="flex flex-col">
        <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">
          {t.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-400 font-medium">
            {format(parseISO(t.date), "HH:mm - dd/MM")}
          </span>
          <span className="text-[10px] text-slate-400">•</span>
          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">
            {wallets.find((w) => w.id === t.walletId)?.name}
          </span>
        </div>
      </div>
    </div>
    <div className="text-right">
      <p
        className={cn(
          "text-sm font-black tracking-tight",
          t.type === "income" ? "text-emerald-600" : "text-rose-600",
        )}
      >
        {t.type === "income" ? "+" : "-"}
        {t.amount.toLocaleString()}đ
      </p>
    </div>
  </div>
));
const RoomCard = React.memo(
  ({
    room,
    onClick,
    booking,
  }: {
    room: Room;
    onClick: () => void;
    booking?: Booking;
    key?: string | number;
  }) => {
    const isOverdue =
      booking &&
      booking.status === "checked-in" &&
      isBefore(startOfDay(parseISO(booking.checkOut)), startOfDay(new Date()));

    const statusStyles = {
      available:
        "bg-white border-slate-100 hover:border-emerald-200 ring-emerald-500/10",
      booked: "bg-amber-50 border-amber-200 ring-amber-500/10",
      occupied: isOverdue
        ? "bg-rose-50 border-rose-300 ring-rose-500/20"
        : "bg-rose-50 border-rose-200 ring-rose-500/10",
      cleaning: "bg-white opacity-60 border-slate-100",
      maintenance: "bg-slate-50 border-slate-200",
    }[room.status];

    const badgeStyles = {
      available: "bg-emerald-50 text-emerald-600",
      booked: "bg-amber-100 text-amber-600",
      occupied: isOverdue
        ? "bg-rose-600 text-white"
        : "bg-rose-100 text-rose-600",
      cleaning: "bg-slate-100 text-slate-600",
      maintenance: "bg-slate-200 text-slate-700",
    }[room.status];

    const statusText = {
      available: "Trống",
      booked: "Đã đặt",
      occupied: isOverdue ? "Quá hạn" : "Đang ở",
      cleaning: "Đang dọn...",
      maintenance: "Bảo trì",
    }[room.status];

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={room.status === "cleaning" ? onClick : undefined}
        className={cn(
          "group relative p-5 rounded-2xl border shadow-sm flex flex-col items-stretch text-left transition-all",
          statusStyles,
          room.status === "available" &&
            "ring-2 ring-emerald-500 ring-offset-2",
          room.status === "cleaning" &&
            "cursor-pointer hover:border-emerald-300",
        )}
      >
        <div className="flex justify-between items-start mb-4">
          <span className="text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
            {room.number}
          </span>
          <span
            className={cn(
              "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
              badgeStyles,
            )}
          >
            {room.type}
          </span>
        </div>

        <div className="flex-1">
          {booking ? (
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700 truncate uppercase tracking-tight">
                {booking.guest.name}
              </p>
              <p
                className={cn(
                  "text-[10px] font-medium",
                  isOverdue ? "text-rose-600 font-bold" : "text-slate-500",
                )}
              >
                {isOverdue ? "Quá hạn" : "Check-out"}:{" "}
                {format(parseISO(booking.checkOut), "HH:mm - dd/MM")}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {statusText}
            </p>
          )}
        </div>

        <div className="mt-4">
          {room.status === "available" ? (
            <button
              onClick={onClick}
              className="w-full py-2.5 text-[10px] font-black tracking-widest text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-all uppercase"
            >
              ĐẶT PHÒNG
            </button>
          ) : room.status === "booked" ? (
            <button
              onClick={onClick}
              className="w-full py-2.5 text-[10px] font-black tracking-widest bg-amber-500 text-white rounded-lg shadow-md hover:bg-amber-600 transition-all uppercase"
            >
              NHẬN PHÒNG
            </button>
          ) : room.status === "occupied" ? (
            <button
              onClick={onClick}
              className="w-full py-2.5 text-[10px] font-black tracking-widest bg-white text-rose-600 border border-rose-200 rounded-lg shadow-sm hover:bg-rose-50 transition-all uppercase"
            >
              TRẢ PHÒNG
            </button>
          ) : room.status === "cleaning" ? (
            <div className="space-y-3">
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-2/3 h-full bg-slate-300 animate-pulse"></div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="w-full py-2.5 text-[10px] font-black tracking-widest bg-emerald-500 text-white rounded-lg shadow-md hover:bg-emerald-600 transition-all uppercase"
              >
                Xác nhận dọn
              </button>
            </div>
          ) : null}
        </div>
      </motion.div>
    );
  },
);

import React, { useState, useMemo } from 'react';
import { hotelService } from '../services/hotelService';
import { Attendance, Branch, Employee } from '../types';
import { format, parseISO } from 'date-fns';
import { UserCheck, MapPin, CheckCircle, XCircle, Clock, Calendar, Download, Filter } from 'lucide-react';
import { cn } from '../lib/utils';

interface AttendanceSectionProps {
  branches: Branch[];
  employees: Employee[];
  currentUser: any;
}

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({ branches, employees, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const initialEmployeeFilter = isAdmin ? 'all' : (currentUser?.username || 'all');
  
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>(initialEmployeeFilter);
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const attendanceRecords = useMemo(() => {
    return hotelService.getAttendance().filter(rec => {
      const matchBranch = filterBranch === 'all' || rec.branchId === filterBranch;
      const matchEmployee = filterEmployee === 'all' || rec.employeeId === filterEmployee;
      const matchDate = !filterDate || rec.timestamp.startsWith(filterDate);
      return matchBranch && matchEmployee && matchDate;
    });
  }, [filterBranch, filterEmployee, filterDate]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Bảng chấm công</h2>
          <p className="text-slate-500 text-sm font-medium">
            {isAdmin ? "Quản lý và theo dõi sự hiện diện của toàn bộ nhân viên." : "Theo dõi lịch sử chấm công cá nhân."}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
              <UserCheck size={14} className="text-slate-400" />
              <select 
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none border-none pr-4"
              >
                <option value="all">Tất cả nhân viên</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select 
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="text-xs font-bold bg-transparent outline-none border-none pr-4"
            >
              <option value="all">Tất cả chi nhánh</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Clock size={14} className="text-slate-400" />
            <input 
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs font-bold bg-transparent outline-none border-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-1">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng lượt chấm</div>
          <div className="text-3xl font-black text-slate-800">{attendanceRecords.length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-1">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hợp lệ</div>
          <div className="text-3xl font-black text-emerald-500">
            {attendanceRecords.filter(r => r.status === 'valid').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-1">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Không hợp lệ</div>
          <div className="text-3xl font-black text-rose-500">
            {attendanceRecords.filter(r => r.status === 'invalid').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-100/50 col-span-1 bg-indigo-600">
          <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Tỉ lệ chuyên cần</div>
          <div className="text-3xl font-black text-white">98%</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khoảng cách</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {attendanceRecords.map((rec) => {
                const branch = branches.find(b => b.id === rec.branchId);
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">
                          {format(parseISO(rec.timestamp), 'HH:mm')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {format(parseISO(rec.timestamp), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                          {rec.employeeName.split(' ').pop()?.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-700 text-sm">{rec.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700 text-sm">{branch?.name || 'Chi nhánh ẩn'}</span>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase flex items-center gap-1">
                          <MapPin size={10} />
                          {rec.lat.toFixed(4)}, {rec.lng.toFixed(4)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-xs font-black uppercase tracking-tighter",
                        rec.distance > 50 ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {Math.round(rec.distance)}m
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5",
                        rec.status === 'valid' 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-rose-50 text-rose-600 border border-rose-100"
                      )}>
                        {rec.status === 'valid' ? (
                          <>
                            <CheckCircle size={12} />
                            Hợp lệ
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            Ngoài vùng
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {attendanceRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-300">
                    <UserCheck size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase tracking-widest">Không có dữ liệu chấm công</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

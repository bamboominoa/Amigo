import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { hotelService } from '../services/hotelService';
import { Branch, Attendance, Employee } from '../types';
import { MapPin, CheckCircle, XCircle, Loader2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AttendanceScannerProps {
  employee: Employee;
  userBranch: Branch | null;
  onClose: () => void;
}

export const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ employee, userBranch, onClose }) => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, []);

  const startScanning = () => {
    setStatus('scanning');
    setErrorMsg(null);
    setScanResult(null);

    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );
    
    scannerRef.current = scanner;
    
    scanner.render((result) => {
      setScanResult(result);
      scanner.clear().then(() => {
        handleAttendance(result);
      }).catch(err => console.error(err));
    }, (err) => {
      // Ignore errors during scanning
    });
  };

  const handleAttendance = async (qrData: string) => {
    setStatus('verifying');
    
    // The QR data should be the branch ID
    const targetBranchId = qrData;
    const branches = hotelService.getBranches();
    const branch = branches.find(b => b.id === targetBranchId);

    if (!branch) {
      setStatus('error');
      setErrorMsg("Mã QR không hợp lệ hoặc không thuộc hệ thống.");
      return;
    }

    if (!branch.lat || !branch.lng) {
      setStatus('error');
      setErrorMsg("Chi nhánh này chưa được thiết lập tọa độ vị trí.");
      return;
    }

    // Get current location
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg("Trình duyệt của bạn không hỗ trợ định vị.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setLocation({ lat: userLat, lng: userLng });

        const dist = hotelService.calculateDistance(userLat, userLng, branch.lat!, branch.lng!);
        setDistance(dist);

        const isValid = dist <= 50;
        
        const attendance: Attendance = {
          id: 'att_' + Date.now(),
          employeeId: employee.id,
          employeeName: employee.name,
          branchId: branch.id,
          type: 'check-in', // For simplicity, let's just log every scan
          timestamp: new Date().toISOString(),
          lat: userLat,
          lng: userLng,
          distance: dist,
          status: isValid ? 'valid' : 'invalid'
        };

        hotelService.saveAttendance(attendance);

        if (isValid) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(`Bạn đang ở cách chi nhánh ${Math.round(dist)}m. Bán kính cho phép là 50m.`);
        }
      },
      (err) => {
        setStatus('error');
        setErrorMsg("Không thể lấy vị trí. Vui lòng cho phép quyền truy cập vị trí.");
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Chấm công QR</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            {status === 'idle' && (
              <div className="text-center py-8">
                <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-10 h-10 text-indigo-600" />
                </div>
                <p className="text-gray-600 mb-6">Quét mã QR tại chi nhánh để bắt đầu chấm công.</p>
                <button
                  onClick={startScanning}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
                >
                  Bắt đầu quét
                </button>
              </div>
            )}

            {status === 'scanning' && (
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-square">
                <div id="reader" className="w-full"></div>
                <div className="absolute inset-0 border-2 border-indigo-500/30 pointer-events-none"></div>
              </div>
            )}

            {status === 'verifying' && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Đang xác thực vị trí...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center py-8">
                <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">Thành công!</h4>
                <p className="text-gray-600 mb-6">Đã ghi nhận chấm công tại chi nhánh.</p>
                <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Khoảng cách:</span>
                    <span className="font-bold text-gray-900">{Math.round(distance || 0)}m</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Vị trí:</span>
                    <span className="font-bold text-gray-900">{location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-lg transition-all"
                >
                  Đóng
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-8">
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">Thất bại</h4>
                <p className="text-red-600 font-medium mb-6">{errorMsg}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStatus('idle')}
                    className="flex-1 py-4 bg-gray-100 text-gray-900 font-bold rounded-2xl transition-all"
                  >
                    Thử lại
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl transition-all"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

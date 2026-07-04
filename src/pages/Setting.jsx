import React, { useState, useEffect } from 'react';
import { X, Save, Search, Filter, Eye, EyeOff, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import WhatsAppSettings from '../components/WhatsAppSettings';

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT;
const LOGIN_SHEET = import.meta.env.VITE_LOGIN_SHEET || 'Login';

const EMPTY_FORM = { 
  name: '', 
  contactNo: '', 
  gmail: '', 
  designation: '', 
  userId: '', 
  pass: '', 
  role: 'User',
  pageAccess: []
};

export default function Setting() {
  const [showFormModal, setShowFormModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({ searchQuery: '', role: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fetch users from Google Sheet (Login sheet)
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const { fetchSheetData } = await import('../utils/api');
        const rows = await fetchSheetData(LOGIN_SHEET);
        // Sheet columns (0-indexed): 0=Timestamp, 1=Serial No., 2=Full Name,
        // 3=Contact No., 4=Email, 5=Designation, 6=User ID, 7=Password, 8=Role, 9=Page Access
        const dataRows = rows.slice(1); // skip header row
        const mapped = dataRows.map((row, idx) => ({
          _rowIndex: idx + 2, // row 1 is header
          timestamp:   row[0]  || '',
          serialNo:    row[1]  || '',
          name:        row[2]  || '',
          contactNo:   row[3]  || '',
          gmail:       row[4]  || '',
          designation: row[5]  || '',
          userId:      row[6]  || '',
          pass:        row[7]  || '',
          role:        row[8]  || 'User',
          pageAccess:  row[9]  || '',
        })).filter(row => row.userId || row.name); // skip empty rows
        setUsers(mapped);
      } catch (err) {
        console.error('Failed to load users from sheet:', err);
        toast.error('Failed to load users from Google Sheet');
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  const openAdd = () => { 
    setEditUser(null); 
    setFormData(EMPTY_FORM); 
    setShowFormModal(true); 
  };

  const openEdit = (u) => {
    setEditUser(u);
    setFormData({ 
      name:        u.name, 
      contactNo:   u.contactNo, 
      gmail:       u.gmail, 
      designation: u.designation, 
      userId:      u.userId, 
      pass:        u.pass, 
      role:        u.role,
      pageAccess:  u.pageAccess ? u.pageAccess.split(', ') : []
    });
    setShowFormModal(true);
  };

  const closeForm = () => { 
    setShowFormModal(false); 
    setEditUser(null); 
    setFormData(EMPTY_FORM); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const now = new Date();
      const p = n => n.toString().padStart(2, '0');
      const ts = `${now.getFullYear()}/${p(now.getMonth()+1)}/${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;

      const { insertRow, updateRow } = await import('../utils/api');

      let updatedUsers;
      if (editUser) {
        updatedUsers = users.map(u => 
          u.serialNo === editUser.serialNo ? { ...u, ...formData } : u
        );
        
        // Google Sheet columns: Timestamp, Serial No., Full Name, Contact No., Email, Designation, User ID, Password, Role, Page access
        const rowData = [
          editUser.timestamp, // Keep original timestamp
          editUser.serialNo,
          formData.name,
          formData.contactNo,
          formData.gmail,
          formData.designation,
          formData.userId,
          formData.pass,
          formData.role,
          formData.pageAccess.join(', ')
        ];
        
        // Note: Assuming _rowIndex is correctly stored (usually starts at 2 for data under headers)
        if (editUser._rowIndex) {
          await updateRow(editUser._rowIndex, rowData, LOGIN_SHEET);
        }
        
        toast.success('User updated successfully!');
      } else {
        const sn = `SN-${String(users.length + 1).padStart(3, '0')}`;
        const newUser = {
          ...formData,
          pageAccess: formData.pageAccess.join(', '),
          serialNo: sn,
          timestamp: ts,
          _rowIndex: users.length + 2
        };
        updatedUsers = [...users, newUser];
        
        const rowData = [
          ts,
          sn,
          formData.name,
          formData.contactNo,
          formData.gmail,
          formData.designation,
          formData.userId,
          formData.pass,
          formData.role,
          formData.pageAccess.join(', ')
        ];
        
        await insertRow(rowData, LOGIN_SHEET);
        toast.success('User added successfully!');
      }

      setUsers(updatedUsers);
      closeForm();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error('Failed to save to Google Sheet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (u) => {
    if (!window.confirm(`Are you sure you want to delete user "${u.name}"?`)) return;
    
    const updatedUsers = users.filter(user => user.serialNo !== u.serialNo);
    setUsers(updatedUsers);
    toast.success('User deleted successfully!');
  };

  const filteredUsers = users.filter(u => {
    const q = filters.searchQuery.toLowerCase();
    return (!q || u.name.toLowerCase().includes(q) || u.serialNo.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q))
      && (!filters.role || u.role === filters.role);
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const set = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-4 gap-4 overflow-y-auto overflow-x-hidden scrollbar-hide">

      {/* One-time WhatsApp order-confirmation settings */}
      <WhatsAppSettings />

      {/* Search and Filters Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center gap-3 shadow-sm">
        <div className="flex w-full lg:w-auto gap-2 items-center flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Name, Serial No, ID..." 
              value={filters.searchQuery}
              onChange={e => { setFilters({ ...filters, searchQuery: e.target.value }); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-sky-500 text-sm h-[38px]" 
            />
          </div>
          <button 
            onClick={() => setShowMobileFilters(!showMobileFilters)} 
            className={`lg:hidden flex items-center justify-center rounded-md shadow-sm h-[38px] w-[38px] flex-shrink-0 transition-all ${showMobileFilters ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter size={16} />
          </button>
          <button 
            onClick={openAdd} 
            className="lg:hidden bg-[#0284c7] hover:bg-[#0369a1] text-white flex items-center justify-center rounded-md h-[38px] w-[38px] shadow-sm flex-shrink-0 transition-colors"
          >
            <span className="text-xl font-bold leading-none mt-[-2px]">+</span>
          </button>
        </div>
        <div className={`${showMobileFilters ? 'flex' : 'hidden'} lg:flex flex-col sm:flex-row gap-2 w-full lg:w-auto items-center`}>
          <select 
            value={filters.role} 
            onChange={e => { setFilters({ ...filters, role: e.target.value }); setCurrentPage(1); }} 
            className="w-full lg:w-40 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-500 h-[38px]"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
        </div>
        <button 
          onClick={openAdd} 
          className="hidden lg:flex bg-[#0284c7] hover:bg-[#0369a1] text-white px-6 py-2 h-[38px] rounded-md font-bold text-sm items-center justify-center gap-2 whitespace-nowrap shadow-sm uppercase tracking-wider transition-colors flex-shrink-0"
        >
          <span className="text-lg font-black leading-none mt-[1px]">+</span> Add User
        </button>
      </div>

      {/* Data Section */}
      <div className="bg-white rounded-lg border border-slate-200 flex-1 flex flex-col overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 min-h-[400px]">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Loading......</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50">
              {paginatedUsers.map(u => (
                <div key={u._rowIndex ?? u.serialNo} className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 flex flex-col gap-2 relative">
                  <div className="flex justify-between items-center bg-slate-50 -mx-3 -mt-3 px-3 py-2 border-b border-slate-100 rounded-t-lg">
                    <span className="text-[11px] font-bold text-sky-600">{u.serialNo}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-medium tracking-widest uppercase border ${u.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{u.role}</span>
                      <button onClick={() => openEdit(u)} className="p-1 text-sky-600 hover:bg-sky-50 rounded transition-all"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(u)} className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-all"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="mt-1">
                    <h3 className="text-[13px] font-bold text-slate-700 uppercase truncate">{u.name}</h3>
                    <p className="text-[11px] text-slate-500 truncate">{u.designation}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Contact</p>
                      <p className="text-[11px] font-medium text-slate-700">{u.contactNo}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Page Access</p>
                      <p className="text-[10px] font-medium text-slate-700 whitespace-normal break-words">{u.pageAccess || 'None'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Gmail</p>
                      <p className="text-[11px] font-medium text-slate-700 truncate">{u.gmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5 block">Login ID</span>
                      <span className="text-[11px] font-bold text-slate-700">{u.userId}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5 block">Pass</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-600">{visiblePasswords[u.serialNo] ? u.pass : `***${u.pass.slice(-3)}`}</span>
                        <button onClick={() => setVisiblePasswords(p => ({ ...p, [u.serialNo]: !p[u.serialNo] }))} className="text-slate-400 hover:text-sky-600 transition-colors p-0.5">
                          {visiblePasswords[u.serialNo] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && <div className="p-4 text-center text-slate-500 bg-white rounded-lg border border-slate-100 shadow-sm text-sm">No users found.</div>}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto flex-1 scrollbar-hide">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead className="bg-[#f8fafc] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap w-28">Action</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">Serial No</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">Timestamp</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">Contact No</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">Gmail</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">Designation</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">ID</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">Pass</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">Role</th>
                    <th className="px-4 py-3 text-left text-[12px] font-bold text-slate-700 uppercase whitespace-nowrap">Page Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map(u => (
                    <tr key={u._rowIndex ?? u.serialNo} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openEdit(u)} className="inline-flex items-center justify-center p-1.5 bg-sky-50 text-sky-600 rounded-md hover:bg-sky-100 transition-colors border border-sky-100" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(u)} className="inline-flex items-center justify-center p-1.5 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-colors border border-rose-100" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-sky-600 whitespace-nowrap font-medium">{u.serialNo}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{u.timestamp}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 uppercase whitespace-nowrap font-semibold">{u.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{u.contactNo}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{u.gmail}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap uppercase">{u.designation}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{u.userId}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{visiblePasswords[u.serialNo] ? u.pass : `***${u.pass.slice(-3)}`}</span>
                          <button onClick={() => setVisiblePasswords(p => ({ ...p, [u.serialNo]: !p[u.serialNo] }))} className="text-slate-400 hover:text-sky-600 transition-colors p-0.5">
                            {visiblePasswords[u.serialNo] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] tracking-widest uppercase border ${u.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-500 max-w-[200px] whitespace-normal break-words">{u.pageAccess || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No users found.</div>}
            </div>

            {/* Pagination Bar */}
            <div className="px-4 py-2 border-t border-slate-200 bg-[#f8fafc] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-bold focus:outline-none focus:border-sky-500 shadow-sm shadow-slate-100"
                >
                  {[10, 15, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <span className="text-[12px] font-bold text-slate-500">
                  {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 border border-slate-200 rounded bg-white disabled:opacity-30 hover:bg-slate-50 transition shadow-sm text-sky-600"
                >
                  <ChevronLeft size={16} strokeWidth={3} />
                </button>
                <span className="mx-2 text-[12px] font-bold text-slate-600">Pg {currentPage}/{totalPages || 1}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 border border-slate-200 rounded bg-white disabled:opacity-30 hover:bg-slate-50 transition shadow-sm text-sky-600"
                >
                  <ChevronRight size={16} strokeWidth={3} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Form Modal - MATCHING LEAVE REQUEST STYLE */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 pb-safe pt-safe">
          <div className="bg-white w-[92%] sm:w-full max-w-[360px] sm:max-w-md h-auto max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
            
            {/* Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800">
                {editUser ? `Edit User — ${editUser.serialNo}` : 'Add New User'}
              </h2>
              <button onClick={closeForm} className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-hide">
              <form id="userForm" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                
                {/* Read-only info strip in edit mode */}
                {editUser && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Timestamp</label>
                      <p className="text-xs font-semibold text-slate-700">{editUser.timestamp}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <label className="text-xs text-slate-500">Serial No</label>
                      <p className="text-sm font-bold text-sky-600">{editUser.serialNo}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-xs sm:text-sm text-slate-600">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Enter full name"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs sm:text-sm text-slate-600">Contact No</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Phone number"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                      value={formData.contactNo} 
                      onChange={e => setFormData({ ...formData, contactNo: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs sm:text-sm text-slate-600">Gmail</label>
                    <input 
                      required 
                      type="email" 
                      placeholder="Email address"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                      value={formData.gmail} 
                      onChange={e => setFormData({ ...formData, gmail: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs sm:text-sm text-slate-600">Designation</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Position"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                      value={formData.designation} 
                      onChange={e => setFormData({ ...formData, designation: e.target.value.toUpperCase() })} 
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs sm:text-sm text-slate-600">Login ID</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="User ID"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                      value={formData.userId} 
                      onChange={e => setFormData({ ...formData, userId: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs sm:text-sm text-slate-600">Password</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Password"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                      value={formData.pass} 
                      onChange={e => setFormData({ ...formData, pass: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs sm:text-sm text-slate-600">User Role</label>
                    {editUser ? (
                      <input readOnly value={formData.role} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-slate-500 cursor-not-allowed font-medium" />
                    ) : (
                      <select 
                        value={formData.role} 
                        onChange={e => setFormData({ ...formData, role: e.target.value })} 
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-xs sm:text-sm text-slate-600">Page Access</label>
                  <div className="grid grid-cols-2 gap-2 mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    {['Dashboard', 'Upload', 'Confirm order', 'Approved', 'Setting'].map(page => (
                      <label key={page} className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.pageAccess.includes(page)}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData({ ...formData, pageAccess: [...formData.pageAccess, page] });
                            } else {
                              setFormData({ ...formData, pageAccess: formData.pageAccess.filter(p => p !== page) });
                            }
                          }}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 sm:w-4 sm:h-4"
                        />
                        {page}
                      </label>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-t border-slate-100 bg-slate-50 flex gap-2 sm:gap-3 flex-shrink-0">
              <button 
                type="button" 
                onClick={closeForm} 
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-all text-xs sm:text-sm shadow-sm"
              >
                Cancel
              </button>
              <button 
                form="userForm" 
                type="submit" 
                disabled={isSaving} 
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-medium py-2 sm:py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm text-xs sm:text-sm"
              >
                {isSaving ? (
                  <div className="w-4 h-4 sm:w-[18px] sm:h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                )}
                {isSaving ? 'Saving...' : (editUser ? 'Update User' : 'Save User')}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

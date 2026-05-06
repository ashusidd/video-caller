import { useState, useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

// Components
import AddFriend from './AddFriend';
import FriendRequest from './FriendRequest';
import ProfileModal from './ProfileModal';

export default function Navbar() {
    // Context se requestCount nikaala
    const { userData, requestCount } = useContext(VideoContext);

    // Modal state
    const [activeModal, setActiveModal] = useState(null);

    const toggleModal = (modalName) => {
        setActiveModal(activeModal === modalName ? null : modalName);
    };

    return (
        <>
            {/* --- 1. FIXED TOP NAVBAR --- */}
            <nav className="h-[65px] bg-[#202c33] px-4 md:px-6 flex items-center justify-between border-b border-white/5 shrink-0 relative z-50 shadow-sm">

                {/* Brand Logo */}
                <div className="flex items-center gap-3">
                    <span className="text-white font-black text-xl tracking-widest italic uppercase">V-CALL HD</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-5 md:gap-7">

                    {/* Add Friend Button */}
                    <button
                        onClick={() => toggleModal('add')}
                        className={`transition-all text-xl hover:scale-110 active:scale-95 ${activeModal === 'add' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                        title="Add Friend"
                    >
                        ➕
                    </button>

                    {/* Friend Requests Button (Dynamic Count) */}
                    <button
                        onClick={() => toggleModal('requests')}
                        className={`relative transition-all text-xl hover:scale-110 active:scale-95 ${activeModal === 'requests' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                        title="Friend Requests"
                    >
                        🔔
                        {/* Notification Badge: Sirf tabhi render hoga jab count 0 se zyada ho */}
                        {requestCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#202c33] animate-in zoom-in duration-300">
                                {requestCount}
                            </span>
                        )}
                    </button>

                    {/* Profile Avatar Button */}
                    <div
                        className="relative cursor-pointer hover:scale-105 active:scale-95 transition-all"
                        onClick={() => toggleModal('profile')}
                    >
                        <img
                            src={userData?.photo || 'https://via.placeholder.com/150'}
                            className={`w-10 h-10 rounded-full object-cover border-2 transition-all 
                            ${activeModal === 'profile' ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10'}`}
                            alt="Profile"
                        />
                    </div>
                </div>
            </nav>

            {/* --- 2. FULL SCREEN MODALS --- */}
            {activeModal && (
                <div className="fixed inset-0 z-[100] bg-[#0b141a] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Modal Header */}
                    <div className="h-[65px] bg-[#202c33] px-4 flex items-center gap-4 border-b border-white/5 shrink-0 shadow-md">
                        <button
                            onClick={() => setActiveModal(null)}
                            className="text-white text-2xl px-2 py-1 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                        >
                            ←
                        </button>
                        <h2 className="text-white font-black text-sm tracking-widest uppercase italic">
                            {activeModal === 'add' && 'Add New Friend'}
                            {activeModal === 'requests' && 'Pending Requests'}
                            {activeModal === 'profile' && 'Profile Settings'}
                        </h2>
                    </div>

                    {/* Modal Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0b141a]">
                        <div className="max-w-xl mx-auto w-full p-4 md:p-8">
                            {activeModal === 'add' && <AddFriend />}
                            {activeModal === 'requests' && <FriendRequest />}
                            {activeModal === 'profile' && <ProfileModal onClose={() => setActiveModal(null)} />}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
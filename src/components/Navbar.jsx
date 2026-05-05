import { useState, useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

// Aapke components
import AddFriend from './AddFriend';
import FriendRequest from './FriendRequest';
import ProfileModal from './ProfileModal';

export default function Navbar() {
    const { userData } = useContext(VideoContext);

    // Konsa full-screen page kholna hai uska state
    const [activeModal, setActiveModal] = useState(null);

    const toggleModal = (modalName) => {
        setActiveModal(activeModal === modalName ? null : modalName);
    };

    return (
        <>
            {/* --- 1. FIXED TOP NAVBAR --- */}
            {/* Ye hamesha upar fix rahega aur niche ka content scroll hoga */}
            <nav className="h-[65px] bg-[#202c33] px-4 md:px-6 flex items-center justify-between border-b border-white/5 shrink-0 relative z-50 shadow-sm">

                {/* Brand Logo */}
                <div className="flex items-center gap-3">
                    <span className="text-white font-black text-xl tracking-widest italic">V-CALL HD</span>
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

                    {/* Friend Requests Button */}
                    <button
                        onClick={() => toggleModal('requests')}
                        className={`relative transition-all text-xl hover:scale-110 active:scale-95 ${activeModal === 'requests' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                        title="Friend Requests"
                    >
                        🔔
                        {/* Notification Dot */}
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-[#202c33]"></span>
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

            {/* --- 2. FULL SCREEN MODALS (WhatsApp Style) --- */}
            {activeModal && (
                <div className="fixed inset-0 z-[100] bg-[#0b141a] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Modal Header with BACK Button */}
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

                    {/* Modal Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0b141a]">
                        {/* PC par max-width set ki hai taaki ajeeb na lage, Mobile par full width lega */}
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
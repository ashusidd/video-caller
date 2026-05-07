import { useState, useContext, useEffect } from 'react'; // useEffect add kiya
import { VideoContext } from '../context/VideoContext';
import AddFriend from './AddFriend';
import FriendRequest from './FriendRequest';
import ProfileModal from './ProfileModal';

export default function Navbar() {
    const { userData, requestCount } = useContext(VideoContext);
    const [activeModal, setActiveModal] = useState(null);

    // ==============================================================
    // 📱 MOBILE BACK BUTTON LOGIC (The "History Fix")
    // ==============================================================
    useEffect(() => {
        // Jab modal khule, history mein ek fake entry push karo
        if (activeModal) {
            window.history.pushState({ modalOpen: true }, "");
        }

        const handlePopState = () => {
            // Agar user ne back button dabaya, toh modal band kar do
            setActiveModal(null);
        };

        // Browser ke back button ko listen karo
        window.addEventListener('popstate', handlePopState);

        return () => {
            // Cleanup: Jab component unmount ho toh listener hata do
            window.removeEventListener('popstate', handlePopState);
        };
    }, [activeModal]);

    const toggleModal = (modalName) => {
        setActiveModal(activeModal === modalName ? null : modalName);
    };

    // UI ke "←" button ke liye function
    const handleManualClose = () => {
        setActiveModal(null);
        // Agar modal history state ki wajah se khula tha, toh stack saaf karo
        if (window.history.state?.modalOpen) {
            window.history.back();
        }
    };

    return (
        <>
            <nav className="h-[65px] bg-[#202c33] px-4 md:px-6 flex items-center justify-between border-b border-white/5 shrink-0 relative z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-white font-black text-xl tracking-widest italic uppercase">V-CALL HD</span>
                </div>

                <div className="flex items-center gap-5 md:gap-7">
                    <button onClick={() => toggleModal('add')} className="text-zinc-400 hover:text-white text-xl">➕</button>

                    <button onClick={() => toggleModal('requests')} className="relative text-zinc-400 hover:text-white text-xl">
                        🔔
                        {requestCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#202c33]">
                                {requestCount}
                            </span>
                        )}
                    </button>

                    <div className="relative cursor-pointer" onClick={() => toggleModal('profile')}>
                        <img
                            // 🔥 Pehle 'photo' dekhega, phir 'photoURL', aur last mein initials wala avatar
                            src={userData?.photo || userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.name}&background=random&color=fff`}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
                            alt="Profile"
                            onError={(e) => {
                                // Agar link broken ho ya image load na ho, toh initials wala backup dikhao
                                e.target.src = `https://ui-avatars.com/api/?name=${userData?.name}&background=random&color=fff`;
                            }}
                        />
                    </div>
                </div>
            </nav>

            {/* --- FULL SCREEN MODALS --- */}
            {activeModal && (
                <div className="fixed inset-0 z-[100] bg-[#0b141a] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="h-[65px] bg-[#202c33] px-4 flex items-center gap-4 border-b border-white/5">
                        <button
                            onClick={handleManualClose} // Manual close function
                            className="text-white text-2xl px-2 py-1 hover:bg-white/10 rounded-xl transition-all"
                        >
                            ←
                        </button>
                        <h2 className="text-white font-black text-sm tracking-widest uppercase italic">
                            {activeModal === 'add' && 'Add New Friend'}
                            {activeModal === 'requests' && 'Pending Requests'}
                            {activeModal === 'profile' && 'Profile Settings'}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[#0b141a]">
                        <div className="max-w-xl mx-auto w-full p-4 md:p-8">
                            {activeModal === 'add' && <AddFriend />}
                            {activeModal === 'requests' && <FriendRequest />}
                            {activeModal === 'profile' && <ProfileModal onClose={handleManualClose} />}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
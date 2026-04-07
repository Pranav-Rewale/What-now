import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Users, MapPin, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Feed', testId: 'nav-feed' },
  { href: '/following', icon: Users, label: 'Following', testId: 'nav-following', authRequired: true },
  { href: '/communities', icon: MapPin, label: 'Local', testId: 'nav-communities' },
  { href: '/profile', icon: User, label: 'Profile', testId: 'nav-profile', authRequired: true },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-white border-t border-[#E6E6E6]"
      style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map((item) => {
          if (item.authRequired && !user) return null;
          const isActive =
            item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.authRequired && !user ? '/auth' : item.href}
              data-testid={item.testId}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#FFE100] rounded-b-full"
                />
              )}
              <item.icon
                className={`w-5 h-5 ${isActive ? 'text-[#1A1A1A]' : 'text-[#A0A0A0]'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-xs font-heading font-semibold ${isActive ? 'text-[#1A1A1A]' : 'text-[#A0A0A0]'}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

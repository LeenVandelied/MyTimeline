'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import frLocale from "@fullcalendar/core/locales/fr";
import enLocale from "@fullcalendar/core/locales/en-gb";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import AddProduct from "@/components/products/AddProducts";
import { FullCalendarEvent, mapToFullCalendarEvent } from "@/types/event";
import { getProducts } from "@/services/productService";
import { Product } from "@/types/product";
import { LanguageSelector } from "@/components/ui/language-selector";
import dayjs from 'dayjs';
import { AppFooter } from '@/components/ui/footer-app';
import { motion } from 'framer-motion';
import { 
  CalendarDays, 
  User, 
  Mail, 
  Shield, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Package, 
  Zap, 
  RefreshCw 
} from 'lucide-react';
import '@/styles/calendar.css';
import EventContent from '@/components/EventContent';

interface ApiError extends Error {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
}

export default function Dashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [calendarEvents, setCalendarEvents] = useState<FullCalendarEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const calendarRef = useRef<FullCalendar>(null);
  const [currentViewTitle, setCurrentViewTitle] = useState<string>("");

  const getFullCalendarLocale = () => {
    switch (locale) {
      case 'fr':
        return frLocale;
      case 'en':
        return enLocale;
      default:
        return frLocale;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      if (!user) return;
      const productsData = await getProducts(user.id);
      setProducts(productsData);
      setCalendarEvents(productsData.flatMap(product => 
        (product.events || []).map(event => 
          mapToFullCalendarEvent(event, product.name, product.category.name, product.id)
        )
      ));
    } catch (error) {
      console.error("Erreur lors du chargement des données :", error);
      if (error instanceof Error && 'response' in error && 
          typeof (error as ApiError).response === 'object' && 
          (error as ApiError).response?.status === 403) {
        console.error("Détails de l'erreur 403:", {
          userId: user?.id,
          user: user
        });
      }
    } finally {
      setLoadingEvents(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, loading, router, locale]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (calendarRef.current) {
        setCurrentViewTitle(calendarRef.current.getApi().view.title);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    }
  };
  
  const updateCurrentDate = (calendarApi?: ReturnType<FullCalendar['getApi']>) => {
    if (!calendarApi) return;
    setCurrentViewTitle(calendarApi.view.title);
  };

  const handleCalendarNavigation = (direction: 'prev' | 'next') => {
    const calendarApi = calendarRef.current?.getApi();

    if (!calendarApi) return;

    const newDate = dayjs(calendarApi.getDate());
    const updatedDate =
      direction === 'next' ? newDate.add(1, 'month') : newDate.subtract(1, 'month');
    calendarApi.gotoDate(updatedDate.toDate());

    updateCurrentDate(calendarApi);
  };

  const handleToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    
    calendarApi.today();
    updateCurrentDate(calendarApi);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="relative w-16 h-16 mx-auto">
            <motion.div 
              animate={{ 
                rotate: 360,
                transition: { 
                  repeat: Infinity, 
                  duration: 1.5, 
                  ease: "linear" 
                } 
              }}
              className="absolute inset-0 rounded-full border-t-2 border-b-2 border-purple-500"
            />
            <div className="absolute inset-3 rounded-full bg-gray-900 flex items-center justify-center">
              <CalendarDays className="h-6 w-6 text-purple-500" />
            </div>
          </div>
          <p className="mt-4 text-gray-400 font-medium">{t('common.loading.default')}</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  const resources = products.map(product => ({
    id: product.id,
    title: product.name,
    category: product.category.name
  }));

  const currentLocale = getFullCalendarLocale();

  const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="bg-gradient-to-r from-purple-900 to-indigo-900 shadow-lg backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <CalendarDays className="h-6 w-6 mr-2 text-purple-300" />
              <h1 className="text-xl font-bold text-white">{t('dashboard.title')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-gray-200 hover:text-white hover:bg-purple-800/30 rounded-lg flex items-center gap-2 transition-all duration-300"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('common.buttons.logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden bg-gray-800/50 border-none shadow-xl backdrop-blur-sm rounded-xl">
            <CardHeader className="flex flex-row justify-between items-center bg-gradient-to-r from-purple-900/80 to-indigo-900/80 pb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-purple-700/30 flex items-center justify-center shadow-inner">
                  <User className="h-6 w-6 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {t('dashboard.welcome')}, {user.username}
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 260, 
                        damping: 20, 
                        delay: 0.3 
                      }}
                    >
                      <Zap className="h-5 w-5 text-yellow-400" />
                    </motion.div>
                  </h2>
                  <p className="text-indigo-200 opacity-90">{t('dashboard.lastConnection')}: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <AddProduct onProductAdded={fetchData} />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3 p-4 bg-gray-700/40 rounded-lg border border-gray-700">
                  <Mail className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-gray-400 text-sm">{t('dashboard.email')}</p>
                    <p className="text-white font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-700/40 rounded-lg border border-gray-700">
                  <Shield className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-gray-400 text-sm">{t('dashboard.role')}</p>
                    <p className="text-white font-medium">{user.role}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-700/40 rounded-lg border border-gray-700">
                  <Package className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-gray-400 text-sm">{t('dashboard.products')}</p>
                    <p className="text-white font-medium">{products.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="overflow-hidden bg-gray-800/50 border-none shadow-xl backdrop-blur-sm rounded-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 pb-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-indigo-300" />
                <h2 className="text-xl font-bold text-white">{t('dashboard.recentEvents.title')}</h2>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingEvents ? (
                <div className="flex justify-center items-center h-[500px] bg-gray-800/30 backdrop-blur-sm">
                  <motion.div 
                    animate={{ 
                      rotate: 360 
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2, 
                      ease: "linear" 
                    }}
                  >
                    <RefreshCw className="h-8 w-8 text-indigo-400" />
                  </motion.div>
                  <p className="ml-3 text-indigo-200">{t('common.loading.default')}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between py-4 px-6 bg-gray-700/40 border-b border-gray-700">
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCalendarNavigation('prev')}
                        className="bg-gray-700/50 hover:bg-gray-600 border-gray-600 text-gray-200 hover:text-white transition-all duration-300 flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>{t('common.buttons.previous')}</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleToday}
                        className="bg-indigo-600/40 hover:bg-indigo-600 border-indigo-700 text-gray-200 hover:text-white transition-all duration-300"
                      >
                        {t('common.buttons.today')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCalendarNavigation('next')}
                        className="bg-gray-700/50 hover:bg-gray-600 border-gray-600 text-gray-200 hover:text-white transition-all duration-300 flex items-center gap-1"
                      >
                        <span>{t('common.buttons.next')}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xl font-bold text-white bg-indigo-800/30 px-4 py-1 rounded-full">
                      {currentViewTitle}
                    </div>
                  </div>
                  <div className="fullcalendar-container p-3 bg-gray-800/40">
                    <FullCalendar
                      ref={calendarRef}
                      plugins={[resourceTimelinePlugin]}
                      locale={currentLocale}
                      initialView="resourceTimelineMonth"
                      initialDate={new Date()}
                      dateAlignment="day"
                      schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
                      events={calendarEvents}
                      resources={resources}
                      headerToolbar={false}
                      height="auto"
                      resourceAreaWidth="15%"
                      resourceAreaHeaderContent={t('dashboard.products')}
                      resourceGroupField="category"
                      slotLabelFormat={{
                        weekday: 'short',
                        day: 'numeric',
                        omitCommas: true
                      }}
                      resourceLabelDidMount={arg => {
                        const el = arg.el;
                        if (el) {
                          el.classList.add('resource-label');
                          el.title = arg.resource.title;
                        }
                      }}
                      eventClassNames={({ event }) => {
                        const now = new Date();
                        const startDate = event.start || now;
                        const endDate = event.end || now;
                        
                        if (endDate < now) {
                          return ['events-expired'];
                        } else if (startDate <= now && now <= endDate) {
                          return ['events-ongoing'];
                        } else {
                          return ['events-upcoming'];
                        }
                      }}
                      eventContent={(eventInfo) => <EventContent eventInfo={eventInfo} />}
                      nowIndicator={true}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
} 
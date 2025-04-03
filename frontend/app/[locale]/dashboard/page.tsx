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
import { calculateRemainingTime } from "@/utils/time-utils";
import { getEventClassNames } from '@/utils/calendar-utils';
import dayjs from 'dayjs';
import { AppFooter } from '@/components/ui/footer-app';

interface ApiError extends Error {
  response?: {
    status: number;
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

  // Fonction adaptateur pour transformer les appels time.expired en common.time.expired
  const tTimeAdapter = (key: string) => {
    // Si la clé commence par 'common.', on la laisse telle quelle
    if (key.startsWith('common.')) {
      return t(key.substring(7)); // Enlever le préfixe 'common.'
    }
    return t(key);
  };

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
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading.default')}</p>
        </div>
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">{t('dashboard.title')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-white hover:text-gray-200"
              >
                {t('buttons.logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="mb-6 bg-gray-800 border-gray-700 shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-300">
              {t('dashboard.welcome')}, {user.username} 
            </h2>
            <AddProduct onProductAdded={fetchData} />
          </CardHeader>
          <CardContent className="text-gray-400">
            <p>Email: {user.email}</p>
            <p>Rôle: {user.role}</p>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gray-800 border-gray-700 shadow-lg w-full">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-300">{t('dashboard.recentEvents.title')}</h2>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex justify-center items-center h-[500px]">
                <p className="text-gray-400">{t('loading.default')}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCalendarNavigation('prev')}
                      className="bg-gray-700 hover:bg-gray-600 border-gray-600"
                    >
                      &lt; {t('buttons.previous')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleToday}
                      className="bg-gray-700 hover:bg-gray-600 border-gray-600"
                    >
                      {t('buttons.today')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCalendarNavigation('next')}
                      className="bg-gray-700 hover:bg-gray-600 border-gray-600"
                    >
                      {t('buttons.next')} &gt;
                    </Button>
                  </div>
                  <div className="text-xl font-semibold text-gray-300">
                    {currentViewTitle}
                  </div>
                </div>
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
                  resourceAreaHeaderContent="Produits"
                  resourceGroupField="category"
                  slotLabelFormat={{
                    weekday: 'short',
                    day: 'numeric',
                    omitCommas: true
                  }}
                  eventClassNames={({ event }) => {
                    const isExpired = false; // Détermine si l'événement est expiré
                    return getEventClassNames(event, isExpired);
                  }}
                  eventContent={({ event }) => {
                    const countdown = calculateRemainingTime(new Date(event.start!), tTimeAdapter);
                    
                    return (
                      <div className="p-1 text-xs">
                        <div className="font-bold truncate">{event.title}</div>
                        <div className="truncate text-[10px]">
                          {countdown}
                        </div>
                      </div>
                    );
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <AppFooter />
    </div>
  );
} 
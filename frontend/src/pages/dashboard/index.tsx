"use client";

import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import { useEffect, useState, useCallback } from "react";
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

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['dashboard', 'common', 'products'])),
    },
  };
};

interface ApiError extends Error {
  response?: {
    status: number;
  };
}

export default function Dashboard() {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'products']);
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [calendarEvents, setCalendarEvents] = useState<FullCalendarEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Détermine la locale à utiliser pour FullCalendar en fonction de la langue actuelle
  const getFullCalendarLocale = () => {
    const currentLanguage = i18n.language;
    switch (currentLanguage) {
      case 'fr':
        return frLocale;
      case 'en':
        return enLocale;
      default:
        return frLocale; // Par défaut en français
    }
  };

  const fetchData = useCallback(async () => {
    try {
      console.log("Fetching data for user:", user?.id);
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
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common:loading.default')}</p>
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
              <h1 className="text-xl font-semibold text-white">{t('dashboard:title')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-white hover:text-gray-200"
              >
                {t('common:buttons.logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="mb-6 bg-gray-800 border-gray-700 shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-300">
              {t('dashboard:welcome')}, {user.username} 👋
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
            <h2 className="text-xl font-semibold text-gray-300">{t('dashboard:recentEvents.title')}</h2>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex justify-center items-center h-[500px]">
                <p className="text-gray-400">{t('common:loading.default')}</p>
              </div>
            ) : (
              <FullCalendar
                plugins={[resourceTimelinePlugin]}
                locale={currentLocale}
                initialView="resourceTimelineMonth"
                initialDate={new Date()}
                dateAlignment="day"
                schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
                events={calendarEvents}
                resources={resources}
                resourceGroupField="category"
                slotLabelFormat={[{ day: 'numeric' }, { weekday: 'short' }]}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth",
                }}
                height="500px"
                resourceAreaWidth="15%"
                slotMinWidth={50}
                eventContent={(eventInfo) => {
                  const remainingTime = calculateRemainingTime(eventInfo.event.end || eventInfo.event.start, t);
                  
                  return (
                    <div className="p-1">
                      <div className="font-bold">{eventInfo.event.title}</div>
                      <div className="text-sm">{remainingTime}</div>
                    </div>
                  );
                }}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-3">
            {t('dashboard:actions.createEvent')}
          </Button>
        </div>
      </main>
    </div>
  );
}
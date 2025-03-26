import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import frLocale from "@fullcalendar/core/locales/fr";
import enLocale from "@fullcalendar/core/locales/en-gb";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import AddProduct from "@/components/products/AddProducts";
import { FullCalendarEvent, mapToFullCalendarEvent } from "@/types/event";
import { getProducts } from "@/services/productService";
import { Product } from "@/types/product";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/ui/language-selector";

interface ApiError extends Error {
  response?: {
    status: number;
  };
}

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [calendarEvents, setCalendarEvents] = useState<FullCalendarEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

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
      console.error(t("errors.loading_data"), error);
      if (error instanceof Error && 'response' in error && 
          typeof (error as ApiError).response === 'object' && 
          (error as ApiError).response?.status === 403) {
        console.error(t("errors.details_403"), {
          userId: user?.id,
          user: user
        });
      }
    } finally {
      setLoadingEvents(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">{t("loading")}</p>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
  }; 

  if (!user) return null;

  const resources = products.map(product => ({
    id: product.id,
    title: product.name,
    category: product.category.name
  }));

  // Sélection de la locale pour FullCalendar
  const fullCalendarLocale = i18n.language === 'fr' ? frLocale : enLocale;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-center">{t("dashboard")}</h1>
          <LanguageSelector />
        </div>

        <Card className="mb-6 bg-gray-800 border-gray-700 shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-300">
              {t("welcome")}, {user.username} 👋
            </h2>
            <AddProduct onProductAdded={fetchData} />
          </CardHeader>
          <CardContent className="text-gray-400">
            <p>Email: {user.email}</p>
            <p>{t("user.role")}: {user.role}</p>
            <Button onClick={handleLogout} type="button">
              {t("logout")}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gray-800 border-gray-700 shadow-lg w-full">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-300">{t("events.title")}</h2>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex justify-center items-center h-[500px]">
                <p className="text-gray-400">{t("events.loading")}</p>
              </div>
            ) : (
              <FullCalendar
                plugins={[resourceTimelinePlugin]}
                locale={fullCalendarLocale}
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
                eventContent={(eventInfo) => (
                  <div className="p-1">
                    <div className="font-bold">{eventInfo.event.title}</div>
                    <div className="text-sm">{eventInfo.event.extendedProps.productName}</div>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-3">
            {t("events.add")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
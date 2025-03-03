import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import frLocale from "@fullcalendar/core/locales/fr";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [calendarEvents, setCalendarEvents] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Dashboard</h1>

        {/* Carte des informations utilisateur */}
        <Card className="mb-6 bg-gray-800 border-gray-700 shadow-lg">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-300">Bienvenue, {user.username} 👋</h2>
          </CardHeader>
          <CardContent className="text-gray-400">
            <p>Email: {user.email}</p>
            <p>Rôle: {user.role}</p>
          </CardContent>
        </Card>

        {/* Calendrier */}
        <Card className="mb-6 bg-gray-800 border-gray-700 shadow-lg w-full">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-300">Calendrier des événements</h2>
          </CardHeader>
          <CardContent>
            <FullCalendar
              plugins={[resourceTimelinePlugin]}
              locale={frLocale}
              initialView="resourceTimelineMonth"
              schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
              events={calendarEvents}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,dayGridMonth,listMonth",
              }}
              height="500px"
              className="rounded-lg bg-gray-700 text-gray-300 p-4"
            />
          </CardContent>
        </Card>

        {/* Bouton d'ajout d'événement */}
        <div className="flex justify-center">
          <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-3">
            Ajouter un événement
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
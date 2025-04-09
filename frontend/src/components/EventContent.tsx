'use client';

import { calculateRemainingTime } from '@/utils/time-utils';
import { EventContentArg } from '@fullcalendar/core';
import { useTranslations } from 'next-intl';
import React from 'react';

interface EventContentProps {
  eventInfo: EventContentArg;
}

export const EventContent: React.FC<EventContentProps> = ({ eventInfo }) => {
  const event = eventInfo.event;
  const t = useTranslations();
  
  const countdown = event?._instance?.range?.end 
    ? calculateRemainingTime(new Date(event._instance.range.end), t)
    : null;
  
  return (
    <div className="event-solid-style">
      <div className="z-10 w-full">
        <div className="flex flex-col items-left space-x-2">
          <span className="text-white font-medium truncate" style={{opacity: 1}}>
            {event.title}
          </span>
          {countdown && (
            <span className="text-white font-medium truncate" style={{opacity: 1}}>
              {countdown}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventContent; 
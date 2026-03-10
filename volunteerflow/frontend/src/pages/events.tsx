import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { Calendar, MapPin, Users, Plus, Edit } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  startDate: string;
  spotsAvailable: number;
  status: string;
  participantCount: number;
  applicationCount: number;
}

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);

    fetch(`http://localhost:3001/api/events?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    const colors = {
      UPCOMING: 'text-primary bg-primary-50 border-primary-200',
      ONGOING: 'text-success bg-success-50 border-success-200',
      COMPLETED: 'text-gray-600 bg-gray-50 border-gray-200',
      CANCELLED: 'text-danger bg-danger-50 border-danger-200',
    };
    return colors[status as keyof typeof colors] || colors.UPCOMING;
  };

  return (
    <>
      <Head>
        <title>Events - VolunteerFlow</title>
      </Head>

      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Events</h1>
              <p className="mt-2 text-gray-600">Browse and manage volunteer opportunities</p>
            </div>
            <Button variant="primary" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            {['', 'UPCOMING', 'ONGOING', 'COMPLETED'].map((status) => (
              <button
                key={status || 'all'}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status || 'All Events'}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i}>
                      <div className="p-6 space-y-4 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </Card>
                  ))
              : events.map((event) => (
                  <Card key={event.id} hover className="cursor-pointer">
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                          {event.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            event.status
                          )}`}
                        >
                          {event.status}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(event.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Users className="w-4 h-4 text-gray-400" />
                          {event.participantCount} / {event.spotsAvailable} volunteers
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                (event.participantCount / event.spotsAvailable) * 100,
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <p className="mt-2 text-xs text-gray-600">
                          {event.spotsAvailable - event.participantCount} spots remaining
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" className="flex-1">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Events;
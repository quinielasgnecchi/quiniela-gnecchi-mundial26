import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Match } from '../../types';

type GroupMatch = Omit<Match, 'status' | 'home_score' | 'away_score'>;

interface GroupedMatches {
  [key: string]: GroupMatch[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupedMatches>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true);
        
        const { data, error: supabaseError } = await supabase
          .from('matches')
          .select('id, group_name, match_date, match_time, home_team, away_team, phase')
          .eq('phase', 'groups')
          .order('match_date', { ascending: true })
          .order('match_time', { ascending: true });

        if (supabaseError) throw supabaseError;

        if (data) {
          const grouped = data.reduce((acc: GroupedMatches, match: GroupMatch) => {
            const group = match.group_name;
            if (!acc[group]) {
              acc[group] = [];
            }
            acc[group].push(match);
            return acc;
          }, {});

          setGroups(grouped);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar los partidos');
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg font-semibold text-gray-600">Cargando partidos del Mundial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-xl mx-auto my-8 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 font-medium">Hubo un error al obtener los datos:</p>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  const groupNames = Object.keys(groups).sort();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Fase de Grupos - Mundial 2026
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {groupNames.map((groupName) => (
          <div 
            key={groupName} 
            className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
          >
            <div className="bg-blue-600 px-4 py-3">
              <h2 className="text-xl font-bold text-white text-center">
                GRUPO {groupName}
              </h2>
            </div>

            <div className="divide-y divide-gray-100 p-4">
              {groups[groupName].map((match) => (
                <div key={match.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="text-xs text-gray-500 font-medium mb-1 text-center">
                    {match.match_date} — {match.match_time}
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <span className="w-5/12 text-right font-medium text-gray-700 truncate">
                      {match.home_team}
                    </span>
                    <span className="w-2/12 text-center text-xs font-bold text-gray-400">
                      VS
                    </span>
                    <span className="w-5/12 text-left font-medium text-gray-700 truncate">
                      {match.away_team}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

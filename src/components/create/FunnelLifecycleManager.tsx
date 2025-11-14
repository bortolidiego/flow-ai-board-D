import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FunnelStage {
  id: string;
  name: string;
  position: number;
  color: string;
  active?: boolean;
}

const FunnelLifecycleManager: React.FC = () => {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('funnel_configurations')
        .select('id, name, position, color')
        .eq('pipeline_id', 'current_pipeline')
        .order('position');

      if (data && data.length > 0) {
        setActiveStage(data[0].id);
      }
    })();
  }, []);

  const handleStageTransition = async (stageId: string) => {
    try {
      setPendingUpdate(true);
      
      // Update split screen configuration
      supabase.from('funnel_configurations')
        .update({
          active: { [stageId]: true },
          'updated_at': supabase.raw('CURRENT_TIMESTAMP')
        })
        .eq('pipeline_id', 'current_pipeline')
        .single();

      setPendingUpdate(false);
    } catch (error) {
      setPendingUpdate(false);
      console.error('Stage update failed:', error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-48 overflow-auto">
      <nav className="md:w-60 p-4 bg-card/50 shadow-md">
        {activeStage && (
          <div className="font-medium text-sm mb-2 text-gray-600">
            Active: {data.find(d => d.id === activeStage)?.name}
          </div>
        )}
        
        {/* List of stages from Supabase */}
        {data.map(d => (
          <div 
            key={d.id} 
            className={`p-2 border border-gray-200 transition-colors ${d.id === activeStage ? 'active : inactive'}`}>
            <div className={`flex items-center gap-2 w-full py-3 text-sm`}>
              <div className={`w-20 bg-[${d.color || '#666'}] h-5 rounded-lg mb-1`} />
              <span className="flex-1 px-2">{d.name}</span>
            </div>
          </div>
        ))}
      </nav>

      {/* Split Screen View */}
      {activeStage && (
        <div className="flex-grow overflow-auto w-full p-4">
          <div className="flex justify-between">
            <div className="w-full flex flex-col gap-2">
              <h4 className="text-lg font-medium text-gray-600 mb-4">
                Current Stage: {data.find(d => d.id === activeStage)?.name}
              </h4>
              
              {/* Stage Content */}
              {essays && essays.length > 0 && (
                essays.map(essay => (
                  <div 
                    key={essay.id}
                    className={`bg-white p-3 rounded-lg shadow-md ${activeStage ? 'border border-gray-200' : 'border-transparent'}`}>
                    <h5 className="text-sm font-medium mb-1">{essay.title}</h5>
                    <p className="text-gray-600">{essay.content}</p>
                  </div>
                ))
              )}
            </div>
            
            {/* Other Panel */}
            <div className="w-1/2 p-4">
              <p className="mt-4">
                Total Value: ${totalValue}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(FunnelLifecycleManager);
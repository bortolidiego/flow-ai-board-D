import { useMemo } from 'react';
import { SLAConfig } from './useKanbanData';

interface UseSLAProps {
    card: {
        createdAt: string;
        updatedAt?: string;
        lastActivityAt?: string | null;
        completionType?: string | null;
        columnName?: string;
    };
    slaConfig?: SLAConfig;
}

export interface SLAStatus {
    status: 'ok' | 'warning' | 'overdue' | 'completed';
    elapsedMinutes: number;
    remainingMinutes: number;
    targetMinutes: number;
    strategy: string;
}

export function calculateSLA(card: UseSLAProps['card'], slaConfig?: SLAConfig): SLAStatus | null {
    if (!slaConfig || card.completionType) return null;

    const firstResponseMinutes = slaConfig.first_response_minutes || 60;
    const ongoingResponseMinutes = slaConfig.ongoing_response_minutes || 1440;
    const warningThreshold = slaConfig.warning_threshold_percent || 80;
    const strategy = slaConfig.sla_strategy || 'response_time';

    // Se coluna for "Finalizados", considerar completed
    if (card.columnName === 'Finalizados') {
        return { status: 'completed', elapsedMinutes: 0, remainingMinutes: 0, targetMinutes: 0, strategy };
    }

    let targetMinutes: number;
    let baseTime: Date;

    if (strategy === 'resolution_time') {
        targetMinutes = ongoingResponseMinutes;
        baseTime = new Date(card.createdAt);
    } else {
        // response_time
        const isNewContact = card.columnName === 'Novo Contato' || card.columnName?.toLowerCase().includes('novo');

        if (isNewContact) {
            targetMinutes = firstResponseMinutes;
            baseTime = new Date(card.createdAt);
        } else {
            targetMinutes = ongoingResponseMinutes;
            // Prioriza lastActivityAt, depois updatedAt, depois createdAt
            const lastTime = card.lastActivityAt || card.updatedAt || card.createdAt;
            baseTime = new Date(lastTime);
        }
    }

    const now = new Date();
    const elapsedMs = now.getTime() - baseTime.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

    const remainingMinutes = Math.max(0, targetMinutes - elapsedMinutes);
    const percentElapsed = targetMinutes > 0 ? (elapsedMinutes / targetMinutes) * 100 : 100;

    let status: 'ok' | 'warning' | 'overdue';

    if (elapsedMinutes >= targetMinutes) {
        status = 'overdue';
    } else if (percentElapsed >= warningThreshold) {
        status = 'warning';
    } else {
        status = 'ok';
    }

    return {
        status,
        elapsedMinutes,
        remainingMinutes,
        targetMinutes,
        strategy
    };
}

export function useSLA({ card, slaConfig }: UseSLAProps): SLAStatus | null {
    return useMemo(() => {
        return calculateSLA(card, slaConfig);
    }, [card.createdAt, card.updatedAt, card.lastActivityAt, card.completionType, card.columnName, slaConfig]);
}

import { getJourneyState as desktopJourneyState } from '../shared/journey';
import { getHostedJourneyState } from '../shared/hosted-journey';
import { isHosted } from './api';

export const getJourneyState = isHosted ? getHostedJourneyState : desktopJourneyState;

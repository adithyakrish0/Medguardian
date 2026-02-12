// UI Components Index
// Import all reusable UI components from here

// Skeleton Loaders - For loading states
export {
    SkeletonDashboard,
    SkeletonCaregiverView,
    SkeletonGraph,
    SkeletonCard,
    SkeletonStat,
    SkeletonPatientCard
} from './SkeletonLoaders';

// Empty States - For when there's no data
export {
    NoMedicationsYet,
    AllCaughtUp,
    NoPatientsYet,
    NoAlertsYet,
    NoActivityYet,
    NoReportsYet,
    NoDosesToday
} from './EmptyStates';

// Error States - For error handling
export {
    ErrorState,
    NetworkError,
    ServerError,
    AccessDenied
} from './ErrorStates';

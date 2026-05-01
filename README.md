# Personal Expense Tracker

A minimal full-stack expense tracker application.

## How to Run

### Backend
1. `cd backend`
2. `npm install`
3. `npx ts-node src/index.ts`
The backend will run on `http://localhost:3001`.
(It uses a local SQLite database file `expenses.db` created in the backend folder.)

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
The frontend will run on Vite's default port (usually `http://localhost:5173`).

## Key Design Decisions
- **Full-Stack Split**: Separated backend (Express) and frontend (Vite+React) for clear separation of concerns.
- **SQLite Database**: Used SQLite for an easy-to-setup database that doesn't require extra background services while maintaining real persistence.
- **Vanilla CSS**: Used Vanilla CSS with CSS variables to ensure high customizability, an elegant UI, and adherence to the requirements (no Tailwind without explicit permission).
- **Optimistic UI with Fallbacks**: Implemented loading spinners, error states, and disabled button states to handle slow or failed API responses gracefully.

## Trade-offs Made Because of Timebox
- **Testing**: While basic automated tests are nice to have, setting up Jest and React Testing Library for the entire flow within the strict timebox was traded off to focus on a highly robust core application flow.
- **Validation**: Handled entirely on the frontend and straightforward logic on the backend, omitting complex validation libraries like Zod.
- **Authentication**: Left out completely as it was not required.

## What Was Intentionally Not Done
- No complex ORM like Prisma or TypeORM was used to keep the backend extremely lean and directly demonstrate SQL capability.
- No editing or deleting functionalities to adhere closely to the minimal acceptance criteria ("record and review").

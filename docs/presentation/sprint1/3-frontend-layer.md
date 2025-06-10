# RAG Chatbot Frontend Architecture Documentation

## Overview

The frontend of the RAG (Retrieval-Augmented Generation) Chatbot is a web-based interface built with React and TypeScript, designed to enable users to upload PDF, TXT, and DOCX documents, send queries, and receive real-time responses grounded in the uploaded content. It leverages Socket.IO for real-time communication, Axios for HTTP requests, and Tailwind CSS for a responsive, user-friendly design. Enhancements from Sprint 1 include improved UI/UX, support for multiple file types, robust error handling, performance optimizations, and a modularized codebase with comprehensive testing.

## Work Plan

The development of the RAG Chatbot frontend was executed in a two-week sprint, focusing on enhancing user experience, functionality, performance, and code quality. The plan was divided into two phases:

- **Week 1: Core Enhancements and Functionality**

  - **Days 1–2**: Implemented UI/UX improvements, including loading spinners, message timestamps, responsive Tailwind CSS styling, and ARIA labels for accessibility.
  - **Days 3–4**: Added support for TXT and DOCX files, chat persistence with `localStorage`, and input validation with toast notifications.
  - **Day 5**: Enhanced error handling with `react-toastify` for user-friendly messages and Socket.IO reconnect logic.

- **Week 2: Performance, Code Quality, and Testing**
  - **Days 6–7**: Optimized performance with debounced inputs, virtualized chat rendering via `react-window`, and lazy-loaded dependencies.
  - **Days 8–9**: Modularized `App.tsx` into `ChatWindow`, `FileUploader`, and `MessageInput`, added TypeScript interfaces, and created a `useSocket` hook.
  - **Days 10–12**: Developed unit tests (Jest, React Testing Library), E2E tests (Cypress), and snapshot tests for UI components.
  - **Days 13–14**: Conducted code reviews, refactored for consistency, updated documentation, and prepared for deployment.

This structured plan ensured timely delivery of a polished, scalable frontend with robust testing and documentation.

## Architecture

### Components

1. **Main Application (`index.tsx`)**

   - **Purpose**: Initializes the React application and renders the core `App` component.
   - **Functionality**: Sets up the React root with `ReactDOM.createRoot` and renders the `App` component in `StrictMode`.
   - **Key Dependencies**: `react`, `react-dom`.

2. **App Component (`App.tsx`)**

   - **Purpose**: Orchestrates the main application logic, coordinating child components for file uploads, chat display, and message input.
   - **Functionality**:
     - **State Management**: Uses `useState` for `messages` (chat history with timestamps), `input` (user query), and `file` (uploaded file). Persists `messages` in `localStorage` for chat history retention.
     - **Real-Time Communication**: Utilizes a custom `useSocket` hook for Socket.IO connection, handling `response` and `connect_error` events.
     - **File Upload**: Delegates file selection and upload to `FileUploader` component.
     - **Chat Interface**: Renders `ChatWindow` for message display and `MessageInput` for user input.
   - **Key Dependencies**: `react`, `socket.io-client`, `axios`, `react-toastify`.

3. **ChatWindow Component (`ChatWindow.tsx`)**

   - **Purpose**: Displays the chat history with user and bot messages.
   - **Functionality**: Uses `react-window` for virtualized rendering of large message lists. Displays messages with timestamps and sender-based styling (user: right-aligned blue, bot: left-aligned green).
   - **Key Dependencies**: `react`, `react-window`.

4. **FileUploader Component (`FileUploader.tsx`)**

   - **Purpose**: Handles file selection and upload for PDF, TXT, and DOCX formats.
   - **Functionality**: Validates file types client-side, shows loading spinners during upload (via `react-spinners`), and displays toast notifications for success/errors (via `react-toastify`). Supports TXT extraction with `FileReader` and DOCX with `mammoth.js`.
   - **Key Dependencies**: `react`, `axios`, `mammoth.js`, `react-spinners`, `react-toastify`.

5. **MessageInput Component (`MessageInput.tsx`)**

   - **Purpose**: Manages user input for chat queries.
   - **Functionality**: Includes a debounced input field (using `lodash.debounce`) to reduce state updates. Validates input to prevent empty messages, showing toast warnings. Emits messages via `useSocket` hook.
   - **Key Dependencies**: `react`, `lodash.debounce`, `react-toastify`.

6. **Styling (`index.css` and Tailwind CSS)**

   - **Purpose**: Provides a responsive, accessible UI.
   - **Functionality**:
     - **Tailwind CSS**: Replaces `App.css` with utility classes for responsive layout (e.g., `max-w-lg`, `sm:max-w-2xl`), scrollable chat (`overflow-y-auto`), and sender-based message styling.
     - **index.css**: Retains global font settings and anti-aliasing.
     - **Accessibility**: ARIA labels on inputs/buttons (e.g., `aria-label="Send message"`) and keyboard-navigable chat.
   - **Key Features**: Mobile-optimized layout, virtualized chat scrolling, and distinct sender styling.

### Data Flow

1. **File Upload**:

   - User selects a file (PDF, TXT, DOCX) via `FileUploader`.
   - Client-side validation checks file type; invalid types trigger `react-toastify` warnings.
   - Valid files are sent to `http://localhost:4000/upload` using Axios with `FormData`. A spinner displays during upload.
   - On success, a toast confirms upload; errors (e.g., empty file) show as toasts. `messages` in `localStorage` are cleared.

2. **Chat Interaction**:

   - User types a query in `MessageInput`, with debounced updates to `input` state.
   - On "Send," `MessageInput` validates non-empty input, adds the message to `messages` (with timestamp), emits it via Socket.IO (`chat` event), and clears the input.
   - Socket.IO `connect_error` events trigger a reconnect prompt with retry logic every 5 seconds.
   - Backend responses via `response` event update `messages` state, rendered in `ChatWindow` with virtualized scrolling.

### API Calls

1. **HTTP Request**:

   - **Endpoint**: `POST http://localhost:4000/upload`
   - **Purpose**: Uploads PDF, TXT, or DOCX files.
   - **Payload**: `FormData` with a file field (`pdf`, `txt`, or `docx`).
   - **Response**: `{ message: "Document processed" }` or error (e.g., `400` for invalid file).
   - **Library**: Axios, with `multipart/form-data` headers and dynamic imports for lazy loading.

2. **Socket.IO Events**:

   - **Event**: `chat`
     - **Purpose**: Sends user query to the backend.
     - **Payload**: String (user’s message).
     - **Emitted From**: `MessageInput` via `useSocket`.
   - **Event**: `response`
     - **Purpose**: Receives bot response.
     - **Payload**: String (LLM-generated answer).
     - **Handled In**: `useSocket` hook, updates `messages` state.
   - **Event**: `connect_error`
     - **Purpose**: Handles connection issues.
     - **Payload**: Error object.
     - **Handled In**: `useSocket`, triggers reconnect prompt.

## Why It Works This Way

- **React with TypeScript**: Component-based architecture and type safety ensure maintainable, error-free code.
- **Socket.IO with Custom Hook**: `useSocket` encapsulates real-time logic, improving reusability and handling disconnections robustly.
- **Axios with Lazy Loading**: Dynamic imports reduce bundle size, while Axios handles file uploads efficiently.
- **Tailwind CSS**: Utility-first styling enables rapid, responsive design with minimal CSS.
- **Modular Components**: Splitting `App.tsx` into `ChatWindow`, `FileUploader`, and `MessageInput` enhances scalability.
- **Virtualized Rendering**: `react-window` optimizes performance for large chat histories.
- **Testing**: Jest, React Testing Library, and Cypress ensure stability across unit, E2E, and snapshot tests.

## Implemented Improvements (Sprint 1)

1. **UI/UX Enhancements**:

   - **Loading States**: Spinners (via `react-spinners`) for uploads and responses in `FileUploader` and `MessageInput`.
   - **Message Metadata**: Timestamps added to `Message` interface, displayed in `ChatWindow`.
   - **Responsive Design**: Tailwind CSS ensures mobile-friendly layout with media queries.
   - **Accessibility**: ARIA labels and keyboard navigation implemented across components.

2. **Functionality Improvements**:

   - **Multiple File Types**: `FileUploader` supports PDF, TXT (`FileReader`), and DOCX (`mammoth.js`) with backend updates.
   - **Chat Persistence**: `messages` stored in `localStorage`, cleared on file upload.
   - **Input Validation**: `MessageInput` prevents empty messages with toast warnings; `FileUploader` validates file types.

3. **Error Handling**:

   - **User-Friendly Errors**: `react-toastify` replaces alerts for upload failures, empty files, and invalid types.
   - **Socket Errors**: `useSocket` handles disconnections, showing reconnect prompts with retry logic.

4. **Performance**:

   - **Debouncing Input**: `lodash.debounce` in `MessageInput` reduces state updates.
   - **Virtualized Chat**: `react-window` in `ChatWindow` optimizes rendering for large histories.
   - **Lazy Loading**: Socket.IO and Axios dynamically imported in `App.tsx`.

5. **Code Structure**:

   - **Component Modularization**: `App.tsx` split into `ChatWindow`, `FileUploader`, and `MessageInput`.
   - **Type Safety**: TypeScript interfaces for `Message`, `Socket`, and state types across components.
   - **Custom Hooks**: `useSocket` encapsulates Socket.IO logic.

6. **Testing**:

   - **Unit Tests**: Jest and React Testing Library test rendering, state, and events in all components.
   - **E2E Tests**: Cypress tests cover file upload and chat workflows.
   - **Snapshot Testing**: Snapshots for UI components detect unintended changes.

## Future Recommendations

1. **Advanced Features**:
   - Add message editing/deletion in `ChatWindow`, updating `messages` state and `localStorage`.
   - Implement query expansion in backend for improved RAG accuracy.
2. **Performance**:
   - Optimize `mammoth.js` for large DOCX files with client-side fallbacks.
   - Cache embeddings locally to reduce backend calls.
3. **Scalability**:
   - Introduce state management (e.g., Redux) for complex state across components.
   - Containerize app with Docker for easier deployment.
4. **Testing**:
   - Add stress tests for high message volumes.
   - Mock Socket.IO events in unit tests for better coverage.

## Conclusion

The RAG Chatbot frontend, enhanced in Sprint 1, delivers a robust, user-friendly experience with support for multiple file types, real-time chat, and optimized performance. Modular components, TypeScript, and comprehensive testing ensure maintainability and stability. Future improvements can focus on advanced features and scalability to further elevate its portfolio value.

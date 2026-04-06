/**
 * src/index.js — React Entry Point
 *
 * WHAT: Mounts the React application into the #root DOM element.
 *
 * HOW:  Uses React 18's createRoot API. Wraps App in React.StrictMode which
 *       surfaces potential issues during development.
 *
 * WHY:  Standard CRA entry point — kept minimal to avoid cluttering the bootstrap.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

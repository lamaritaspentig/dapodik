/**
 * Entry point frontend. Hanya bootstrap event DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  renderStudentFormFields();
  bindNavigation();
  bindStudentControls();
  bindImportControls();
  bindRecapControls();
  bindConflictControls();
  bindActivityControls();
  bindRequestControls();
  bindProfileControls();
  bindAuthControls();
  applyApiInfo();
  restoreSession();
});

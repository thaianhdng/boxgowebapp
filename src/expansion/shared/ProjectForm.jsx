import { ProjectFormModal } from "../../components/ProjectFormModal.jsx";

// BOXGO's own Create New / Edit Project window, so both modules create and
// edit projects the same way. `noList` hides the equipment-only parts.
export function ProjectForm({ app, ...props }) {
  return (
    <ProjectFormModal
      productionHouses={app.productionHouses || []}
      rentalHouses={app.rentalHouses || []}
      recentProjectNames={app.recentProjectNames || []}
      recentProjectLabels={app.recentProjectLabels || []}
      projectTags={app.projectTags || []}
      templates={app.templates || []}
      onManageTags={app.openSettings}
      {...props}
    />
  );
}

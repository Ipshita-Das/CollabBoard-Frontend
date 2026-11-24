// Title row at the top of every page inside the app shell
const PageHeader = ({ title, subtitle, actions }) => (
  <header className="page-head">
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions && <div className="page-head-actions">{actions}</div>}
  </header>
);

export default PageHeader;

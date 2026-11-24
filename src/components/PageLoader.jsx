const PageLoader = ({ label = 'Loading…' }) => (
  <div className="page-loader">
    <img src="/logo-cb.png" alt="" />
    {label}
  </div>
);

export default PageLoader;

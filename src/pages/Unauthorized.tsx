import { Link } from "react-router-dom";

const Unauthorized = () => (
  <div className="flex min-h-screen items-center justify-center bg-muted">
    <div className="text-center">
      <h1 className="mb-4 text-4xl font-bold">403</h1>
      <p className="mb-4 text-xl text-muted-foreground">You don't have permission to view this page.</p>
      <Link to="/" className="text-primary underline hover:text-primary/90">
        Return to Home
      </Link>
    </div>
  </div>
);

export default Unauthorized;

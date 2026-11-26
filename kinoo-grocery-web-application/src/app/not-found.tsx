import Link from "next/link";

export default function NotFound() {
  return (
    <div className="k-container" style={{ padding: "56px 0" }}>
      <div className="empty-state" style={{ padding: "64px 22px" }}>
        <div className="es-icon" style={{ fontSize: "1.6rem" }}>
          <i className="bi bi-basket" aria-hidden="true" />
        </div>
        <h3>This shelf is empty</h3>
        <p>
          The page you were looking for is not in the Kinoo aisles. Head back to the storefront and
          keep filling your bag.
        </p>
        <Link className="btn-green" href="/">
          Back to Kinoo
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

import "./photos.css";

export default function PhotosLayout({ children }: { children: React.ReactNode }) {
  return <div className="photos-route-shell">{children}</div>;
}

import * as React from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({
  position = "top-center",
  closeButton = true,
  ...props
}: ToasterProps) => {
  return (
    <Sonner
      position={position}
      closeButton={closeButton}
      className="dhruto-toaster toaster group"
      toastOptions={{
        classNames: {
          toast: "dhruto-toast group toast",
          title: "dhruto-toast-title",
          description: "dhruto-toast-description",
          actionButton: "dhruto-toast-action",
          cancelButton: "dhruto-toast-cancel",
          closeButton: "dhruto-toast-close",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

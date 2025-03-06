import * as React from "react";
import { Controller, ControllerRenderProps, useFormContext } from "react-hook-form";

interface FormMessageProps {
  name: string;
}

interface FormFieldProps {
  name: string;
  children: (field: ControllerRenderProps) => React.JSX.Element;
}

export const Form = ({ children, ...props }: React.HTMLAttributes<HTMLFormElement>) => {
  return (
    <form {...props} className="space-y-4">
      {children}
    </form>
  );
};

export const FormField: React.FC<FormFieldProps> = ({ name, children }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => children(field)}
    />
  );
};

export const FormItem = ({ children }: { children: React.ReactNode }) => {
  return <div className="flex flex-col gap-1">{children}</div>;
};

export const FormMessage: React.FC<FormMessageProps> = ({ name }) => {
  const {
    formState: { errors },
  } = useFormContext();

  const error = errors[name];

  if (!error) return null;

  return <p className="text-red-500 text-sm">{(error as { message?: string })?.message}</p>;
};
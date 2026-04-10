'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-action text-white hover:bg-brand-blue focus:ring-action/40',
  secondary:
    'bg-white text-primary border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 focus:ring-primary/20',
  ghost:
    'bg-transparent text-primary hover:bg-brand-blue/10 dark:text-brand-blue focus:ring-primary/20',
  danger:
    'bg-danger text-white hover:bg-brand-pink focus:ring-danger/30',
  success:
    'bg-success text-white hover:bg-brand-green focus:ring-success/30',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-3 text-base rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth,
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';

    const width = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        type={type}
        className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${width} ${className}`}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export default Button;


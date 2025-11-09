import './Button.css';

const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  fullWidth = false,
  disabled = false,
  className = '',
  ...rest
}) => {
  const classes = [`btn`, `btn-${variant}`];
  if (fullWidth) {
    classes.push('btn-full');
  }
  if (className) {
    classes.push(className);
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes.join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
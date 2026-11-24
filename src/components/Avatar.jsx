const Avatar = ({ name = '', size }) => {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';
  return (
    <span className={`avatar ${size === 'sm' ? 'avatar-sm' : ''}`} title={name}>
      {initials}
    </span>
  );
};

export default Avatar;

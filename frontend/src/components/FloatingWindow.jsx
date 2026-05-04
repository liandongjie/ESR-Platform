import { useEffect, useRef, useState } from 'react';

let floatingWindowZIndex = 200;

function FloatingWindow({
    title,
    className = '',
    children,
    onClose,
    initialPosition = null,
}) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [basePosition, setBasePosition] = useState(initialPosition);
    const [zIndex, setZIndex] = useState(floatingWindowZIndex);
    const dragInfoRef = useRef(null);

    useEffect(() => {
        if (initialPosition) {
            setBasePosition(initialPosition);
            setOffset({ x: 0, y: 0 });
        }
    }, [
        initialPosition?.left,
        initialPosition?.top,
        initialPosition?.width,
    ]);

    const bringToFront = () => {
        floatingWindowZIndex += 1;
        setZIndex(floatingWindowZIndex);
    };

    const handleMouseDown = (event) => {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        bringToFront();

        dragInfoRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: offset.x,
            originY: offset.y,
        };

        document.body.classList.add('window-dragging');

        const handleMouseMove = (moveEvent) => {
            if (!dragInfoRef.current) {
                return;
            }

            const dx = moveEvent.clientX - dragInfoRef.current.startX;
            const dy = moveEvent.clientY - dragInfoRef.current.startY;

            setOffset({
                x: dragInfoRef.current.originX + dx,
                y: dragInfoRef.current.originY + dy,
            });
        };

        const handleMouseUp = () => {
            dragInfoRef.current = null;
            document.body.classList.remove('window-dragging');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            className={`window ${className}`}
            style={{
                left: basePosition?.left,
                top: basePosition?.top,
                width: basePosition?.width,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                zIndex,
            }}
            onMouseDown={bringToFront}
        >
            <div
                className="window-top"
                onMouseDown={handleMouseDown}
            >
                <div>{title}</div>

                {onClose && (
                    <img
                        src="/static/img/close2.gif"
                        alt="关闭"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={onClose}
                    />
                )}
            </div>

            <div className="window-middle">
                {children}
            </div>
        </div>
    );
}

export default FloatingWindow;
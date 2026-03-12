import React, {useCallback, useEffect, useRef, useState} from 'react'
import {useOutletContext} from "react-router";
import {CheckCircle2, ImageIcon, UploadIcon} from "lucide-react";
import {PROGRESS_INTERVAL_MS, PROGRESS_STEP, REDIRECT_DELAY_MS} from "../lib/constants";

interface UploadProps {
    onComplete: (base64Data: string) => void;
}

const Upload = ({ onComplete }: UploadProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {isSignedIn} = useOutletContext<AuthContext>();

    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
        };
    }, []);

    const isValidImageFile = (file: File) => {
        const acceptedExtensions = ['.jpg', '.jpeg', '.png'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = acceptedExtensions.some(ext => fileName.endsWith(ext));
        return file.type.startsWith('image/') && hasValidExtension;
    };

    const processFile = useCallback((file: File) => {
        if (!isSignedIn) return;

        if (!isValidImageFile(file)) {
            setError('Please upload a valid image file (.jpg, .jpeg, or .png)');
            return;
        }

        setFile(file);
        setProgress(0);
        setError(null);

        const reader = new FileReader();
        reader.onerror = () => {
            setFile(null);
            // Optionally show error message to user
            console.error('Failed to read file');
        };
        reader.onload = (e) => {
            const base64Data = e.target?.result as string;

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

            progressIntervalRef.current = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        if (progressIntervalRef.current) {
                            clearInterval(progressIntervalRef.current);
                            progressIntervalRef.current = null;
                        }
                        
                        redirectTimeoutRef.current = setTimeout(() => {
                            onComplete(base64Data);
                        }, REDIRECT_DELAY_MS);
                        return 100;
                    }
                    return prev + PROGRESS_STEP;
                });
            }, PROGRESS_INTERVAL_MS);
        };
        reader.readAsDataURL(file);
    }, [isSignedIn, onComplete]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (isSignedIn) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (!isSignedIn) return;

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isSignedIn) return;

        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    return (
        <div className="upload">
            {!file ? (
                <div
                    className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        className="drop-input"
                        accept=".jpg,.jpeg,.png"
                        disabled={!isSignedIn}
                        onChange={handleChange}
                    />

                    <div className="drop-content">
                        <div className="drop-icon">
                            <UploadIcon size={20} />
                        </div>
                        <p>
                            {isSignedIn ? (
                                "Click to upload or just drag and drop"
                            ) : ("Sign in or sign up with Puter to upload")}
                        </p>
                        {error && <p className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{error}</p>}
                        <p className="help"> Maximum file size 50 MB</p>
                    </div>
                </div>
            ) : (
                <div className="upload-status">
                    <div className="status-content">
                        <div className="status-icon">
                            {progress === 100 ? (
                                <CheckCircle2 className="check" />
                            ): (
                                <ImageIcon className="image" />
                            )}
                        </div>

                        <h3>{file.name}</h3>

                        <div className='progress'>
                            <div className="bar" style={{ width: `${progress}%`}} />

                            <p className="status-text">
                                {progress < 100 ? 'Analyzing Floor Plan...' : 'Redirecting...'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
export default Upload

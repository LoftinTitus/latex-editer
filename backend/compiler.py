import subprocess
import tempfile
import os
import shutil
from pathlib import Path
from typing import Union, Tuple
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LaTeXCompilationError(Exception):
    """Custom exception for LaTeX compilation errors"""
    pass

class LaTeXCompiler:
    """
    LaTeX compiler that supports both Tectonic and pdflatex
    """
    
    def __init__(self):
        self.tectonic_path = None
        self.pdflatex_path = None
        self.tectonic_available = self._check_tectonic()
        self.pdflatex_available = self._check_pdflatex()
        
        if not self.tectonic_available and not self.pdflatex_available:
            raise RuntimeError("Neither Tectonic nor pdflatex is available on this system")
    
    def _check_tectonic(self) -> bool:
        """Check if Tectonic is available"""
        # Check common paths for Tectonic installation
        tectonic_paths = [
            "tectonic",  # In PATH
            "/opt/homebrew/bin/tectonic",  # Homebrew on Apple Silicon
            "/usr/local/bin/tectonic",  # Homebrew on Intel Mac
            "/usr/bin/tectonic"  # System installation
        ]
        
        for tectonic_path in tectonic_paths:
            try:
                result = subprocess.run(
                    [tectonic_path, "--version"], 
                    capture_output=True, 
                    text=True, 
                    timeout=5
                )
                if result.returncode == 0:
                    self.tectonic_path = tectonic_path
                    return True
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
        
        return False
    
    def _check_pdflatex(self) -> bool:
        """Check if pdflatex is available"""
        # Check common paths for pdflatex installation
        pdflatex_paths = [
            "pdflatex",  # In PATH
            "/opt/homebrew/bin/pdflatex",  # Homebrew on Apple Silicon
            "/usr/local/bin/pdflatex",  # Homebrew on Intel Mac
            "/usr/bin/pdflatex",  # System installation
            "/Library/TeX/texbin/pdflatex"  # MacTeX installation
        ]
        
        for pdflatex_path in pdflatex_paths:
            try:
                result = subprocess.run(
                    [pdflatex_path, "--version"], 
                    capture_output=True, 
                    text=True, 
                    timeout=5
                )
                if result.returncode == 0:
                    self.pdflatex_path = pdflatex_path
                    return True
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
        
        return False
    
    def _validate_latex_content(self, latex_content: str) -> None:
        """Basic validation of LaTeX content"""
        if not latex_content.strip():
            raise LaTeXCompilationError("LaTeX content cannot be empty")
        
        # Check for basic document structure if it's a complete document
        if "\\documentclass" in latex_content:
            if "\\begin{document}" not in latex_content:
                raise LaTeXCompilationError("Missing \\begin{document}")
            if "\\end{document}" not in latex_content:
                raise LaTeXCompilationError("Missing \\end{document}")
    
    def _compile_with_tectonic(self, latex_file: Path, output_dir: Path) -> Tuple[bool, str]:
        """Compile LaTeX using Tectonic"""
        try:
            # Tectonic command with output directory
            cmd = [
                self.tectonic_path,
                "--outdir", str(output_dir),
                "--keep-logs",
                str(latex_file)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,  # 30 second timeout
                cwd=output_dir
            )
            
            if result.returncode == 0:
                logger.info("Tectonic compilation successful")
                return True, result.stdout
            else:
                logger.error(f"Tectonic compilation failed: {result.stderr}")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            return False, "Compilation timed out (30 seconds)"
        except Exception as e:
            return False, f"Tectonic compilation error: {str(e)}"
    
    def _compile_with_pdflatex(self, latex_file: Path, output_dir: Path) -> Tuple[bool, str]:
        """Compile LaTeX using pdflatex"""
        try:
            # pdflatex command with output directory
            cmd = [
                self.pdflatex_path,
                "-interaction=nonstopmode",
                "-output-directory", str(output_dir),
                str(latex_file)
            ]
            
            # Run pdflatex twice to resolve references
            for run_number in [1, 2]:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30,  # 30 second timeout
                    cwd=output_dir
                )
                
                if result.returncode != 0 and run_number == 1:
                    # If first run fails, don't attempt second run
                    logger.error(f"pdflatex first run failed: {result.stderr}")
                    return False, result.stderr
            
            if result.returncode == 0:
                logger.info("pdflatex compilation successful")
                return True, result.stdout
            else:
                logger.error(f"pdflatex compilation failed: {result.stderr}")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            return False, "Compilation timed out (30 seconds)"
        except Exception as e:
            return False, f"pdflatex compilation error: {str(e)}"
    
    def compile_latex(self, latex_content: str) -> Union[bytes, None]:
        """
        Compile LaTeX content to PDF and return PDF bytes
        
        Args:
            latex_content: The LaTeX source code as a string
            
        Returns:
            PDF bytes if successful, None if failed
            
        Raises:
            LaTeXCompilationError: If compilation fails
        """
        # Validate input
        self._validate_latex_content(latex_content)
        
        # Create temporary directory for compilation
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            latex_file = temp_path / "document.tex"
            pdf_file = temp_path / "document.pdf"
            
            try:
                # Write LaTeX content to file
                with open(latex_file, 'w', encoding='utf-8') as f:
                    f.write(latex_content)
                
                # Try compilation with preferred compiler
                success = False
                error_message = ""
                
                if self.tectonic_available:
                    logger.info("Attempting compilation with Tectonic")
                    success, message = self._compile_with_tectonic(latex_file, temp_path)
                    if not success:
                        error_message = f"Tectonic error: {message}"
                
                # Fallback to pdflatex if Tectonic fails or is unavailable
                if not success and self.pdflatex_available:
                    logger.info("Attempting compilation with pdflatex")
                    success, message = self._compile_with_pdflatex(latex_file, temp_path)
                    if not success:
                        if error_message:
                            error_message += f"\npdflatex error: {message}"
                        else:
                            error_message = f"pdflatex error: {message}"
                
                if not success:
                    raise LaTeXCompilationError(f"Compilation failed with both compilers:\n{error_message}")
                
                # Check if PDF was created
                if not pdf_file.exists():
                    raise LaTeXCompilationError("PDF file was not created despite successful compilation")
                
                # Read and return PDF bytes
                with open(pdf_file, 'rb') as f:
                    pdf_bytes = f.read()
                
                logger.info(f"Successfully compiled LaTeX to PDF ({len(pdf_bytes)} bytes)")
                return pdf_bytes
                
            except Exception as e:
                logger.error(f"LaTeX compilation error: {str(e)}")
                raise LaTeXCompilationError(str(e))

# Singleton compiler instance
compiler = LaTeXCompiler()

def compile_latex_to_pdf(latex_content: str) -> bytes:
    """
    Convenience function to compile LaTeX content to PDF
    
    Args:
        latex_content: The LaTeX source code as a string
        
    Returns:
        PDF bytes
        
    Raises:
        LaTeXCompilationError: If compilation fails
    """
    return compiler.compile_latex(latex_content)

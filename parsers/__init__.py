from parsers.base import BaseParser
from parsers.apache_parser import ApacheParser
from parsers.linux_parser import LinuxParser
from parsers.windows_parser import WindowsParser
from parsers.paloalto_parser import PaloAltoParser
from parsers.aws_parser import AWSParser

PARSERS = {
    "apache": ApacheParser(),
    "linux": LinuxParser(),
    "windows": WindowsParser(),
    "paloalto": PaloAltoParser(),
    "aws": AWSParser(),
}

__all__ = [
    "BaseParser",
    "ApacheParser",
    "LinuxParser",
    "WindowsParser",
    "PaloAltoParser",
    "AWSParser",
    "PARSERS",
]